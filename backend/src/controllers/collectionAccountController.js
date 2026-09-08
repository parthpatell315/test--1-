const { prisma } = require("../lib/prisma");
const { isProtectedSuperadminEmail, isProtectedSuperadminIdentity } = require("../config/superadmin");

const isFounderOrSuperadmin = (user) => {
  if (!user) return false;
  const role = (user.role || "").toLowerCase();
  if (role === "founder" || role === "superadmin" || user.isSuperuser) return true;
  if (user.email && isProtectedSuperadminEmail(user.email)) return true;
  if (isProtectedSuperadminIdentity(user)) return true;
  return false;
};

const resolveTenantId = (req) => {
  return req.headers["x-tenant-id"] || req.user?.tenantId || "default";
};

// Seed/ensure initial default accounts if none exist
const ensureDefaultAccounts = async (tenantId, adminId) => {
  try {
    const existingRiya = await prisma.paymentReceivingAccount.findFirst({
      where: {
        tenantId,
        accountName: { contains: "Riya", mode: "insensitive" },
      },
    });

    if (!existingRiya) {
      await prisma.paymentReceivingAccount.create({
        data: {
          tenantId,
          accountName: "Riya Train Portal Account",
          accountHolderName: "Riya Travel & Tours (India) Pvt Ltd",
          accountType: "OTHER",
          ownershipType: "PARTNER",
          paymentMethods: ["BANK_TRANSFER", "UPI"],
          description: "Authoritative Riya train ticketing wallet for IRCTC/train bookings",
          isApproved: true,
          isActive: true,
          createdByAdminId: adminId || null,
        },
      });
    }

    const count = await prisma.paymentReceivingAccount.count({
      where: { tenantId },
    });

    if (count <= 1) {
      const defaults = [
        {
          tenantId,
          accountName: "Trrabb Company Account",
          accountHolderName: "Trrabb Adventures Pvt Ltd",
          accountType: "COMPANY",
          ownershipType: "COMPANY",
          paymentMethods: ["UPI", "BANK_TRANSFER", "CARD", "OTHER"],
          bankName: "HDFC Bank",
          accountNumber: "50200084920192",
          maskedAccountNumber: "XXXX0192",
          ifsc: "HDFC0001234",
          upiId: "trrabb@hdfcbank",
          description: "Official Trrabb primary collection account",
          isApproved: true,
          isActive: true,
          createdByAdminId: adminId || null,
        },
        {
          tenantId,
          accountName: "Nikulbhai Patel Account",
          accountHolderName: "Nikulbhai Patel",
          accountType: "INDIVIDUAL",
          ownershipType: "INDIVIDUAL",
          paymentMethods: ["UPI", "BANK_TRANSFER"],
          bankName: "State Bank of India",
          accountNumber: "38920192841",
          maskedAccountNumber: "XXXX2841",
          ifsc: "SBIN0004821",
          upiId: "nikulbhai@upi",
          description: "Individual external collection account",
          isApproved: true,
          isActive: true,
          createdByAdminId: adminId || null,
        },
        {
          tenantId,
          accountName: "Cash Collection Account",
          accountHolderName: "Trrabb Cash Desk",
          accountType: "CASH",
          ownershipType: "COMPANY",
          paymentMethods: ["CASH"],
          description: "Physical cash collection and venue register",
          isApproved: true,
          isActive: true,
          createdByAdminId: adminId || null,
        },
      ];

      for (const def of defaults) {
        const exists = await prisma.paymentReceivingAccount.findFirst({
          where: { tenantId, accountName: def.accountName },
        });
        if (!exists) {
          await prisma.paymentReceivingAccount.create({ data: def });
        }
      }
    }
  } catch (e) {
    console.warn("ensureDefaultAccounts error:", e.message);
  }
};

/**
 * GET /api/payments/accounts
 * List all collection accounts with live computed balances
 */
exports.getAccounts = async (req, res) => {
  try {
    const tenantId = resolveTenantId(req);
    const { activeOnly } = req.query;

    await ensureDefaultAccounts(tenantId, req.user?.id);

    const where = { tenantId };
    if (activeOnly === "true") {
      where.isActive = true;
    }

    const accounts = await prisma.paymentReceivingAccount.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "asc" }],
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    // Compute live balance aggregates per account
    const accountIds = accounts.map((a) => a.id);

    const [clientPayments, stationPayments, submissions, vendorPayments, trainTickets] =
      await Promise.all([
        prisma.opsClientPayment.findMany({
          where: {
            tenantId,
            status: { not: "Rejected" },
          },
          select: { collectionAccountId: true, amount: true, paymentMode: true, createdAt: true },
        }),
        prisma.stationPaymentCollection.findMany({
          where: {
            tenantId,
            receivingAccountId: { in: accountIds },
            isReversed: false,
          },
          select: { receivingAccountId: true, amount: true, createdAt: true },
        }),
        prisma.collectionAccountSubmission.findMany({
          where: {
            tenantId,
            accountId: { in: accountIds },
          },
          select: { accountId: true, amount: true, createdAt: true },
        }),
        prisma.opsVendorPayment.findMany({
          where: {
            tenantId,
            collectionAccountId: { in: accountIds },
            status: { not: "Rejected" },
          },
          select: { collectionAccountId: true, advancePaid: true, createdAt: true },
        }),
        prisma.trainTicket.findMany({
          where: {
            tenantId,
            ticketStatus: { not: "CANCELLED" },
          },
          select: { ticketAmount: true, refundAmount: true, createdAt: true },
        }),
      ]);

    const cashAccount = accounts.find(
      (a) => a.accountType === "CASH" || a.accountName.toLowerCase().includes("cash"),
    );

    const upiAccount = accounts.find(
      (a) =>
        a.accountName.toLowerCase().includes("nikul") ||
        (a.upiId && a.upiId.toLowerCase().includes("nikul")) ||
        a.accountType === "INDIVIDUAL" ||
        a.accountType === "UPI",
    );

    const collectedMap = {};
    const submittedMap = {};
    const vendorPaidMap = {};
    const lastActivityMap = {};

    clientPayments.forEach((p) => {
      let targetAccId = p.collectionAccountId;
      if (!targetAccId || !accountIds.includes(targetAccId)) {
        if (p.paymentMode && p.paymentMode.toUpperCase().includes("CASH") && cashAccount) {
          targetAccId = cashAccount.id;
        } else if (
          (!p.paymentMode ||
            p.paymentMode.toUpperCase().includes("UPI") ||
            p.paymentMode.toUpperCase().includes("BANK")) &&
          upiAccount
        ) {
          targetAccId = upiAccount.id;
        }
      }
      if (!targetAccId) return;
      collectedMap[targetAccId] =
        (collectedMap[targetAccId] || 0) + (Number(p.amount) || 0);
      const cur = lastActivityMap[targetAccId];
      if (!cur || p.createdAt > cur) lastActivityMap[targetAccId] = p.createdAt;
    });

    stationPayments.forEach((p) => {
      if (!p.receivingAccountId) return;
      collectedMap[p.receivingAccountId] =
        (collectedMap[p.receivingAccountId] || 0) + (Number(p.amount) || 0);
      const cur = lastActivityMap[p.receivingAccountId];
      if (!cur || p.createdAt > cur) lastActivityMap[p.receivingAccountId] = p.createdAt;
    });

    submissions.forEach((s) => {
      if (!s.accountId) return;
      submittedMap[s.accountId] =
        (submittedMap[s.accountId] || 0) + (Number(s.amount) || 0);
      const cur = lastActivityMap[s.accountId];
      if (!cur || s.createdAt > cur) lastActivityMap[s.accountId] = s.createdAt;
    });

    vendorPayments.forEach((vp) => {
      if (!vp.collectionAccountId) return;
      vendorPaidMap[vp.collectionAccountId] =
        (vendorPaidMap[vp.collectionAccountId] || 0) + (Number(vp.advancePaid) || 0);
      const cur = lastActivityMap[vp.collectionAccountId];
      if (!cur || vp.createdAt > cur) lastActivityMap[vp.collectionAccountId] = vp.createdAt;
    });

    const totalTicketsCost = trainTickets.reduce(
      (s, t) => s + (Number(t.ticketAmount) || 0),
      0,
    );
    const totalTicketRefunds = trainTickets.reduce(
      (s, t) => s + (Number(t.refundAmount) || 0),
      0,
    );

    const enriched = accounts.map((acc) => {
      const isRiya = acc.accountName.toLowerCase().includes("riya");
      if (isRiya) {
        const totalRecharges = submittedMap[acc.id] || 0;
        const totalConsumed = totalTicketsCost;
        const availableBalance = Math.max(
          0,
          totalRecharges - totalConsumed + totalTicketRefunds,
        );
        return {
          ...acc,
          totalCollected: totalRecharges,
          totalSubmitted: totalConsumed,
          totalVendorPaid: 0,
          pending: availableBalance,
          status: availableBalance > 1000 ? "ACTIVE_WALLET" : "LOW_BALANCE",
          lastActivity: lastActivityMap[acc.id] || acc.createdAt,
        };
      }

      const totalCollected = collectedMap[acc.id] || 0;
      const totalSubmitted = submittedMap[acc.id] || 0;
      const totalVendorPaid = vendorPaidMap[acc.id] || 0;
      const pending = Math.max(0, totalCollected - totalSubmitted - totalVendorPaid);

      return {
        ...acc,
        totalCollected,
        totalSubmitted,
        totalVendorPaid,
        pending,
        status: pending <= 0 ? "SETTLED" : "PENDING",
        lastActivity: lastActivityMap[acc.id] || acc.createdAt,
      };
    });

    const summary = {
      totalCollected: enriched.reduce((s, a) => s + a.totalCollected, 0),
      totalSubmitted: enriched.reduce((s, a) => s + a.totalSubmitted, 0),
      totalVendorPaid: enriched.reduce((s, a) => s + (a.totalVendorPaid || 0), 0),
      totalPending: enriched.reduce((s, a) => s + a.pending, 0),
    };

    return res.json({
      success: true,
      data: enriched,
      summary,
    });
  } catch (err) {
    console.error("getAccounts error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch collection accounts" });
  }
};

/**
 * POST /api/payments/accounts
 * Create a new collection account
 */
exports.createAccount = async (req, res) => {
  try {
    if (!isFounderOrSuperadmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Treasury account configuration is strictly restricted to Founder / Superadmin only.",
      });
    }

    const tenantId = resolveTenantId(req);
    const {
      accountName,
      accountHolderName,
      accountType,
      ownershipType,
      paymentMethods,
      bankName,
      accountNumber,
      ifsc,
      upiId,
      description,
      isActive,
    } = req.body;

    if (!accountName || !accountName.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Account name is required" });
    }

    const maskedAccountNumber = accountNumber
      ? `XXXX${accountNumber.slice(-4)}`
      : null;

    const normalizedType = String(accountType || "COMPANY").toUpperCase();
    const validTypes = ["COMPANY", "INDIVIDUAL", "BANK", "UPI", "CASH", "CARD", "OTHER"];
    const finalType = validTypes.includes(normalizedType) ? normalizedType : "COMPANY";

    const account = await prisma.paymentReceivingAccount.create({
      data: {
        tenantId,
        accountName: accountName.trim(),
        accountHolderName: (accountHolderName || accountName).trim(),
        accountType: finalType,
        ownershipType: ownershipType || "COMPANY",
        paymentMethods: Array.isArray(paymentMethods) && paymentMethods.length > 0
          ? paymentMethods
          : ["UPI", "BANK_TRANSFER"],
        bankName: bankName?.trim() || null,
        accountNumber: accountNumber?.trim() || null,
        maskedAccountNumber,
        ifsc: ifsc?.trim() || null,
        upiId: upiId?.trim() || null,
        description: description?.trim() || null,
        isApproved: true,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        createdByAdminId: req.user?.id || null,
      },
    });

    return res.status(201).json({
      success: true,
      data: account,
      message: "Collection account created successfully",
    });
  } catch (err) {
    console.error("createAccount error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to create collection account" });
  }
};

/**
 * PUT /api/payments/accounts/:id
 * Update an existing collection account
 */
exports.updateAccount = async (req, res) => {
  try {
    if (!isFounderOrSuperadmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Treasury account configuration is strictly restricted to Founder / Superadmin only.",
      });
    }

    const { id } = req.params;
    const tenantId = resolveTenantId(req);
    const {
      accountName,
      accountHolderName,
      accountType,
      ownershipType,
      paymentMethods,
      bankName,
      accountNumber,
      ifsc,
      upiId,
      description,
      isActive,
    } = req.body;

    const existing = await prisma.paymentReceivingAccount.findFirst({
      where: { id, tenantId },
    });

    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Collection account not found" });
    }

    const maskedAccountNumber = accountNumber
      ? `XXXX${accountNumber.slice(-4)}`
      : existing.maskedAccountNumber;

    const updated = await prisma.paymentReceivingAccount.update({
      where: { id },
      data: {
        accountName: accountName !== undefined ? accountName.trim() : existing.accountName,
        accountHolderName:
          accountHolderName !== undefined
            ? accountHolderName.trim()
            : existing.accountHolderName,
        accountType: accountType !== undefined ? accountType : existing.accountType,
        ownershipType: ownershipType !== undefined ? ownershipType : existing.ownershipType,
        paymentMethods:
          paymentMethods !== undefined ? paymentMethods : existing.paymentMethods,
        bankName: bankName !== undefined ? bankName?.trim() || null : existing.bankName,
        accountNumber:
          accountNumber !== undefined ? accountNumber?.trim() || null : existing.accountNumber,
        maskedAccountNumber,
        ifsc: ifsc !== undefined ? ifsc?.trim() || null : existing.ifsc,
        upiId: upiId !== undefined ? upiId?.trim() || null : existing.upiId,
        description:
          description !== undefined ? description?.trim() || null : existing.description,
        isActive: isActive !== undefined ? Boolean(isActive) : existing.isActive,
      },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Collection account updated successfully",
    });
  } catch (err) {
    console.error("updateAccount error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to update collection account" });
  }
};

/**
 * DELETE /api/payments/accounts/:id
 * Deactivate or delete collection account
 */
exports.deleteAccount = async (req, res) => {
  try {
    if (!isFounderOrSuperadmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Treasury account configuration is strictly restricted to Founder / Superadmin only.",
      });
    }

    const { id } = req.params;
    const tenantId = resolveTenantId(req);

    // Check if account has any linked transactions
    const [clientCount, vendorCount, stationCount] = await Promise.all([
      prisma.opsClientPayment.count({ where: { collectionAccountId: id } }),
      prisma.opsVendorPayment.count({ where: { collectionAccountId: id } }),
      prisma.stationPaymentCollection.count({ where: { receivingAccountId: id } }),
    ]);

    if (clientCount === 0 && vendorCount === 0 && stationCount === 0) {
      // Safe to permanently delete if no linked transactions exist
      await prisma.paymentReceivingAccount.delete({ where: { id } });
      return res.json({
        success: true,
        message: "Collection account permanently deleted",
      });
    }

    // Soft delete by deactivating so historical records are never orphaned
    const updated = await prisma.paymentReceivingAccount.update({
      where: { id },
      data: { isActive: false },
    });

    return res.json({
      success: true,
      data: updated,
      message: "Collection account archived successfully",
    });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete collection account" });
  }
};

/**
 * GET /api/payments/accounts/:id/ledger
 * Fetch full chronological ledger of payments and submissions for an account
 */
exports.getAccountLedger = async (req, res) => {
  try {
    const { id } = req.params;
    const tenantId = resolveTenantId(req);

    const account = await prisma.paymentReceivingAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Collection account not found" });
    }

    const isCash =
      account.accountType === "CASH" ||
      account.accountName.toLowerCase().includes("cash");

    const isUpi =
      account.accountName.toLowerCase().includes("nikul") ||
      Boolean(account.upiId) ||
      account.accountType === "INDIVIDUAL" ||
      account.accountType === "UPI";

    const clientPaymentsWhere = {
      tenantId,
      status: { not: "Rejected" },
    };

    if (isCash) {
      clientPaymentsWhere.OR = [
        { collectionAccountId: id },
        { paymentMode: { contains: "CASH", mode: "insensitive" } },
        { paymentMode: { in: ["CASH", "Cash", "cash", "OFFICE CASH", "Office Cash"] } },
      ];
    } else if (isUpi) {
      clientPaymentsWhere.OR = [
        { collectionAccountId: id },
        {
          AND: [
            { collectionAccountId: null },
            {
              OR: [
                { paymentMode: { contains: "UPI", mode: "insensitive" } },
                { paymentMode: null },
                { paymentMode: "BANK_TRANSFER" },
              ],
            },
          ],
        },
      ];
    } else {
      clientPaymentsWhere.collectionAccountId = id;
    }

    const [clientPayments, stationPayments, submissions, vendorPayments, trainTickets] =
      await Promise.all([
        prisma.opsClientPayment.findMany({
          where: clientPaymentsWhere,
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: {
                id: true,
                bookingId: true,
                fullName: true,
                name: true,
                phone: true,
                mobile: true,
                email: true,
                tripName: true,
                tripId: true,
                departureDate: true,
                totalAmount: true,
                advancePaid: true,
                remainingAmount: true,
              },
            },
          },
        }),
        prisma.stationPaymentCollection.findMany({
          where: { receivingAccountId: id, tenantId, isReversed: false },
          orderBy: { createdAt: "desc" },
          include: {
            collectedBy: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.collectionAccountSubmission.findMany({
          where: { accountId: id, tenantId },
          orderBy: { createdAt: "desc" },
          include: {
            recordedBy: { select: { id: true, name: true, email: true } },
          },
        }),
        prisma.opsVendorPayment.findMany({
          where: { collectionAccountId: id, tenantId },
          orderBy: { createdAt: "desc" },
          include: {
            trip: {
              select: { id: true, title: true, shortName: true, slug: true },
            },
          },
        }),
        prisma.trainTicket.findMany({
          where: { tenantId },
          orderBy: { createdAt: "desc" },
          include: {
            booking: {
              select: {
                id: true,
                bookingId: true,
                fullName: true,
                name: true,
                phone: true,
                tripName: true,
                tripId: true,
                departureDate: true,
              },
            },
          },
        }),
      ]);

    const isRiya = account.accountName.toLowerCase().includes("riya");

    let totalCollected = 0;
    let totalSubmitted = 0;
    let totalVendorPaid = 0;
    let pending = 0;

    if (isRiya) {
      const activeTickets = trainTickets.filter(
        (t) => t.ticketStatus !== "CANCELLED",
      );
      const totalRecharges = submissions.reduce(
        (s, sub) => s + (Number(sub.amount) || 0),
        0,
      );
      const totalConsumed = activeTickets.reduce(
        (s, t) => s + (Number(t.ticketAmount) || 0),
        0,
      );
      const totalRefunds = trainTickets.reduce(
        (s, t) => s + (Number(t.refundAmount) || 0),
        0,
      );

      totalCollected = totalRecharges;
      totalSubmitted = totalConsumed;
      totalVendorPaid = 0;
      pending = Math.max(0, totalRecharges - totalConsumed + totalRefunds);
    } else {
      totalCollected =
        clientPayments
          .filter((p) => p.status !== "Rejected")
          .reduce((s, p) => s + (Number(p.amount) || 0), 0) +
        stationPayments
          .filter((p) => !p.isReversed)
          .reduce((s, p) => s + (Number(p.amount) || 0), 0);

      totalSubmitted = submissions.reduce(
        (s, sub) => s + (Number(sub.amount) || 0),
        0,
      );

      totalVendorPaid = vendorPayments
        .filter((v) => v.status !== "Rejected")
        .reduce((s, v) => s + (Number(v.advancePaid) || 0), 0);

      pending = Math.max(0, totalCollected - totalSubmitted - totalVendorPaid);
    }

    return res.json({
      success: true,
      data: {
        account,
        clientPayments,
        stationPayments,
        submissions,
        vendorPayments,
        trainTickets: isRiya ? trainTickets : [],
        metrics: {
          totalCollected,
          totalSubmitted,
          totalVendorPaid,
          totalPending: pending,
          status: isRiya
            ? pending > 1000
              ? "ACTIVE_WALLET"
              : "LOW_BALANCE"
            : pending <= 0
              ? "SETTLED"
              : "PENDING",
        },
      },
    });
  } catch (err) {
    console.error("getAccountLedger error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch account ledger" });
  }
};

/**
 * POST /api/payments/accounts/:id/submit
 * Record a fund transfer/submission from a collection account
 */
exports.recordAccountSubmission = async (req, res) => {
  try {
    if (!isFounderOrSuperadmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: Treasury fund transfers and submissions are strictly restricted to Founder / Superadmin only.",
      });
    }

    const { id } = req.params;
    const tenantId = resolveTenantId(req);
    const { amount, paymentMode, referenceNumber, notes } = req.body;

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Valid submission amount is required" });
    }

    const account = await prisma.paymentReceivingAccount.findFirst({
      where: { id, tenantId },
    });

    if (!account) {
      return res
        .status(404)
        .json({ success: false, message: "Collection account not found" });
    }

    const submission = await prisma.collectionAccountSubmission.create({
      data: {
        tenantId,
        accountId: id,
        amount: amt,
        paymentMode: paymentMode || "BANK_TRANSFER",
        referenceNumber: referenceNumber || null,
        notes: notes || null,
        recordedByAdminId: req.user?.id,
      },
      include: {
        account: { select: { id: true, accountName: true, accountHolderName: true } },
        recordedBy: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({
      success: true,
      data: submission,
      message: "Transfer/submission recorded successfully",
    });
  } catch (err) {
    console.error("recordAccountSubmission error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to record submission" });
  }
};

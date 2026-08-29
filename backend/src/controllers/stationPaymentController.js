"use strict";
const { prisma } = require("../lib/prisma");
const { logBookingActivity } = require("../utils/bookingActivityLogger");
const {
  istDayBounds,
  sameIstDay,
  isActiveStationCollection,
  sumActiveStationCollections,
  computeEffectivePaid,
  syncBookingBalanceFromSources,
} = require("../utils/stationPaymentBalance");
const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

async function generateReceiptNumber(tenantId) {
  const year = new Date().getFullYear();
  const count = await prisma.stationPaymentCollection.count({
    where: { tenantId },
  });
  return `YC-PAY-${year}-${String(count + 1).padStart(6, "0")}`;
}

function fmt(amount) {
  return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
}

async function rejectStationAccountingEntries(tx, record) {
  if (!record?.bookingId) return;
  const refs = [record.receiptNumber, record.utrNumber].filter(Boolean);
  if (refs.length === 0) return;
  await tx.accountingEntry.updateMany({
    where: {
      bookingId: record.bookingId,
      status: { in: ["APPROVED", "PENDING"] },
      OR: [
        { referenceNumber: { in: refs } },
        { notes: { contains: record.receiptNumber || "__none__" } },
      ],
    },
    data: { status: "REJECTED" },
  });
}

async function sendReceiptEmail(collection, booking, tripName, adminName) {
  if (!booking || !booking.email) return "NO_EMAIL";
  try {
    const isPaid = collection.newRemaining <= 0;
    const isUpi = collection.paymentMode === "UPI";
    const subject = `Payment Received – ${tripName} – ${booking.bookingId}`;
    const verificationNote =
      isUpi && collection.upiVerificationStatus === "PENDING_VERIFICATION"
        ? `<p style="background:#FFF7ED;border-left:4px solid #F97316;padding:12px 16px;border-radius:4px;font-size:13px;color:#92400E;margin:16px 0">⚠️ Your UPI payment is pending Finance verification. Your booking balance will update once verified.</p>`
        : "";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{margin:0;padding:0;background:#f7f8fa;font-family:'Montserrat','Helvetica Neue',Arial,sans-serif;color:#172033}
.wrap{max-width:580px;margin:24px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08)}
.header{background:#F97316;padding:24px 32px;text-align:center}
.header h1{margin:0;color:#fff;font-size:20px;font-weight:800}
.body{padding:28px 32px}
table{width:100%;border-collapse:collapse;margin-top:16px}
td{padding:8px 4px;font-size:13px;border-bottom:1px solid #f1f5f9}
td:first-child{color:#64748B;width:52%}
td:last-child{font-weight:600;text-align:right}
.sum-section td{background:#FFF7ED;border-bottom:1px solid #fed7aa}
.total-row td{color:#F97316;font-size:15px;font-weight:800;border:none;padding-top:12px}
.footer{background:#f8fafc;padding:16px 32px;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
</style></head><body><div class="wrap">
<div class="header"><h1>YouthCamping</h1><p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:13px">Payment Confirmation Receipt</p></div>
<div class="body">
<p style="font-size:14px;margin:0 0 4px">Dear <strong>${booking.name || booking.fullName || "Traveller"}</strong>,</p>
<p style="font-size:13px;color:#64748B;margin:0 0 16px">We have received your ${isUpi ? "online (UPI)" : "cash"} payment of <strong style="color:#F97316">${fmt(collection.amount)}</strong>.</p>
${verificationNote}
<div style="background:#FFF7ED;border:1.5px solid #FB923C;border-radius:6px;padding:12px 16px;margin-bottom:16px;display:flex;justify-content:space-between">
  <div><span style="font-size:10px;color:#94a3b8;font-weight:700">RECEIPT</span><br><span style="font-size:16px;font-weight:800;color:#F97316">${collection.receiptNumber}</span></div>
  <span style="padding:4px 12px;border-radius:20px;font-size:11px;font-weight:700;background:${isPaid ? "#DCFCE7" : "#FFF7ED"};color:${isPaid ? "#166534" : "#9A3412"};align-self:center">${isPaid ? "FULLY PAID" : "PARTIALLY PAID"}</span>
</div>
<table>
<tr><td>Booking Ref</td><td>${booking.bookingId}</td></tr>
<tr><td>Trip</td><td>${tripName}</td></tr>
<tr><td>Departure</td><td>${collection.departureDate ? new Date(collection.departureDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"}</td></tr>
<tr><td>Station</td><td>${collection.station}</td></tr>
<tr><td>Payment Mode</td><td>${isUpi ? "UPI / Online" : "Cash"}</td></tr>
${isUpi && collection.utrNumber ? `<tr><td>UTR / Transaction ID</td><td>${collection.utrNumber}</td></tr>` : ""}
${isUpi && collection.receivingAccount ? `<tr><td>Received In Account</td><td>${collection.receivingAccount.accountName}</td></tr>` : ""}
<tr><td>Date & Time</td><td>${collection.collectedAt ? new Date(collection.collectedAt).toLocaleString("en-IN") : "—"}</td></tr>
<tr><td>Collected By</td><td>${adminName}</td></tr>
</table>
<table style="margin-top:12px">
<tr class="sum-section"><td>Final Booking Amount</td><td>${fmt(booking.totalAmount || booking.amount)}</td></tr>
<tr class="sum-section"><td>Previously Paid</td><td>${fmt(collection.previousPaid)}</td></tr>
<tr class="sum-section"><td>Received Now</td><td style="color:#16a34a">+ ${fmt(collection.amount)}</td></tr>
<tr class="total-row"><td>New Total Paid</td><td>${fmt(collection.newTotalPaid)}</td></tr>
<tr><td>Remaining Balance</td><td style="color:${isPaid ? "#16a34a" : "#B45309"}">${fmt(collection.newRemaining)}</td></tr>
</table>
<p style="font-size:12px;color:#94a3b8;margin:24px 0 0;text-align:center">Thank you for travelling with YouthCamping.<br>For queries: support@youthcamping.in</p>
</div>
<div class="footer">YouthCamping Travel Pvt. Ltd. • Automated receipt — do not reply.</div>
</div></body></html>`;

    await emailApi.sendTransacEmail({
      sender: {
        name: "YouthCamping",
        email: process.env.EMAIL_FROM || "parthyouthcamping@gmail.com",
      },
      to: [{ email: booking.email, name: booking.name || "Traveller" }],
      subject,
      htmlContent: html,
    });
    return "SENT";
  } catch (err) {
    console.error("[StationPayment] Email failed:", err?.message);
    return "FAILED";
  }
}

// ─── GET /api/station-payments ─────────────────────────────────────────────
exports.getDashboard = async (req, res) => {
  try {
    const {
      tripId,
      departureDate,
      station,
      paymentMode,
      collectionStatus,
      salespersonId,
      collectorId,
      search,
    } = req.query;
    const tenantId = req.user?.tenantId || "default";
    if (!tripId || !departureDate) {
      return res.status(200).json({
        success: true,
        stats: {
          totalDue: 0,
          totalCollected: 0,
          balanceRemaining: 0,
          cashInHand: 0,
          upiVerified: 0,
          upiPending: 0,
        },
        bookings: [],
        handovers: [],
      });
    }

    const dayBounds = istDayBounds(departureDate);
    if (!dayBounds) {
      return res.status(400).json({
        success: false,
        message: "departureDate must be YYYY-MM-DD",
      });
    }
    const { start: startOfDay, end: endOfDay } = dayBounds;

    const bookings = await prisma.booking.findMany({
      where: {
        tenantId,
        tripId,
        departureDate: { gte: startOfDay, lte: endOfDay },
        status: { notIn: ["cancelled", "CANCELLED", "rejected", "REJECTED"] },
      },
      include: {
        stationPayments: {
          include: {
            receivingAccount: true,
            collectedBy: { select: { id: true, name: true } },
            verifiedBy: { select: { id: true, name: true } },
          },
          orderBy: { collectedAt: "desc" },
        },
        salesAdmin: { select: { id: true, name: true } },
        accountingEntries: {
          select: {
            id: true,
            amount: true,
            paymentMode: true,
            referenceNumber: true,
            notes: true,
            status: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    const allBookingKeyList = bookings
      .flatMap((b) => [b.id, b.bookingId])
      .filter(Boolean);
    const allOpsPayments = await prisma.opsClientPayment.findMany({
      where: { bookingId: { in: allBookingKeyList } },
    });
    const opsByBookingKey = new Map();
    for (const p of allOpsPayments) {
      if (!opsByBookingKey.has(p.bookingId)) opsByBookingKey.set(p.bookingId, []);
      opsByBookingKey.get(p.bookingId).push(p);
    }

    let totalPackageAmount = 0,
      totalPreviouslyPaid = 0,
      totalCashCollected = 0,
      totalUpiCollected = 0,
      totalVerifiedUpi = 0,
      totalUnverifiedUpi = 0;
    let fullyPaid = 0,
      partiallyPaid = 0,
      unpaid = 0;
    const collectorCashMap = {},
      collectorUpiMap = {};
    const bookingRows = [];

    for (const bk of bookings) {
      const finalAmount = bk.totalAmount || bk.amount || 0;
      const cashPmts = bk.stationPayments.filter(
        (p) =>
          p.paymentMode === "CASH" &&
          isActiveStationCollection(p),
      );
      const upiPmts = bk.stationPayments.filter(
        (p) =>
          p.paymentMode === "UPI" &&
          !p.isReversed &&
          String(p.collectionStatus || "").toUpperCase() !== "CANCELLED" &&
          String(p.collectionStatus || "").toUpperCase() !== "REVERSED",
      );
      const verifiedUpi = upiPmts.filter(
        (p) => p.upiVerificationStatus === "VERIFIED",
      );
      const pendingUpi = upiPmts.filter(
        (p) => p.upiVerificationStatus === "PENDING_VERIFICATION",
      );
      const cashAmt = cashPmts.reduce((s, p) => s + p.amount, 0);
      const upiAmt = upiPmts.reduce((s, p) => s + p.amount, 0);
      const verifiedAmt = verifiedUpi.reduce((s, p) => s + p.amount, 0);
      const pendingAmt = pendingUpi.reduce((s, p) => s + p.amount, 0);

      const fromId = opsByBookingKey.get(bk.id) || [];
      const fromRef =
        bk.bookingId && bk.bookingId !== bk.id
          ? opsByBookingKey.get(bk.bookingId) || []
          : [];
      const seenOps = new Set();
      const mergedOps = [];
      [...(bk.opsClientPayments || []), ...fromId, ...fromRef].forEach((p) => {
        if (seenOps.has(p.id)) return;
        seenOps.add(p.id);
        mergedOps.push(p);
      });

      const stationTotal = sumActiveStationCollections(bk.stationPayments);
      const computed = computeEffectivePaid({
        totalAmount: finalAmount,
        opsClientPayments: mergedOps,
        legacyPayments: [],
        stationPayments: bk.stationPayments,
        accountingEntries: bk.accountingEntries || [],
      });
      // Paid before station = cleared receipts before station OR stored advancePaid
      const prevPaidBeforeStation =
        computed.opsSum > 0 || computed.accountingSum > 0
          ? Math.max(0, computed.paidAmount - stationTotal)
          : Math.max(0, Number(bk.advancePaid || bk.amount || 0));
      const grandTotal = prevPaidBeforeStation + stationTotal;
      const remaining = Math.max(0, finalAmount - grandTotal);

      totalPackageAmount += finalAmount;
      totalPreviouslyPaid += prevPaidBeforeStation;
      totalCashCollected += cashAmt;
      totalUpiCollected += upiAmt;
      totalVerifiedUpi += verifiedAmt;
      totalUnverifiedUpi += pendingAmt;

      if (remaining <= 0) fullyPaid++;
      else if (grandTotal > 0) partiallyPaid++;
      else unpaid++;

      for (const p of cashPmts) {
        const cid = p.collectedByAdminId;
        if (!collectorCashMap[cid])
          collectorCashMap[cid] = {
            id: cid,
            name: p.collectedBy?.name || cid,
            cash: 0,
          };
        collectorCashMap[cid].cash += p.amount;
      }
      for (const p of upiPmts) {
        const cid = p.collectedByAdminId;
        if (!collectorUpiMap[cid])
          collectorUpiMap[cid] = {
            id: cid,
            name: p.collectedBy?.name || cid,
            upi: 0,
            verified: 0,
          };
        collectorUpiMap[cid].upi += p.amount;
        if (p.upiVerificationStatus === "VERIFIED")
          collectorUpiMap[cid].verified += p.amount;
      }

      let collStat = "NOT_COLLECTED";
      if (cashPmts.length > 0 || verifiedUpi.length > 0)
        collStat = remaining <= 0 ? "FULLY_COLLECTED" : "PARTIALLY_COLLECTED";
      else if (pendingUpi.length > 0) collStat = "UPI_PENDING";

      let members = [];
      if (bk.passengers) {
        if (Array.isArray(bk.passengers)) members = bk.passengers;
        else if (bk.passengers.persons && Array.isArray(bk.passengers.persons))
          members = bk.passengers.persons;
      }
      const mappedMembers = members.map((m) => ({
        name: m.name || "",
        phone: m.phone || m.mobile || "",
      }));

      bookingRows.push({
        id: bk.id,
        bookingId: bk.bookingId,
        name: bk.fullName || bk.name,
        phone: bk.phone || bk.mobile,
        email: bk.email,
        pickupCity: bk.pickupCity,
        salesperson: bk.salesAdmin?.name,
        salespersonId: bk.salesAdminId,
        numberOfPersons: bk.numberOfTravelers || 1,
        members: mappedMembers,
        finalAmount,
        previousPaid: prevPaidBeforeStation,
        remaining: Math.max(0, finalAmount - prevPaidBeforeStation),
        cashCollected: cashAmt,
        upiCollected: upiAmt,
        verifiedUpi: verifiedAmt,
        pendingUpi: pendingAmt,
        stationTotal,
        grandTotal,
        grandRemaining: remaining,
        paymentStatus: bk.paymentStatus,
        paymentMode: bk.paymentMode || bk.payment_method || "UPI",
        paymentMethod: bk.payment_method || bk.paymentMode || "online",
        upiReference: bk.upi_reference,
        accountingEntries: bk.accountingEntries || [],
        collectionStatus: collStat,
        stationPayments: bk.stationPayments,
        createdAt: bk.createdAt,
      });
    }

    const handovers = await prisma.stationCashHandover.findMany({
      where: {
        tenantId,
        tripId,
        departureDate: { gte: startOfDay, lte: endOfDay },
      },
      include: {
        collector: { select: { id: true, name: true } },
        handoverRecipient: { select: { id: true, name: true } },
      },
    });
    const cashHandedOver = handovers
      .filter((h) =>
        ["HANDED_OVER", "CONFIRMED", "RECONCILED"].includes(h.handoverStatus),
      )
      .reduce((s, h) => s + h.amountHandedOver, 0);
    const cashReconciled = handovers
      .filter((h) => h.handoverStatus === "RECONCILED")
      .reduce((s, h) => s + h.amountHandedOver, 0);

    const stats = {
      totalBookings: bookings.length,
      totalPackageAmount,
      totalPreviouslyPaid,
      totalCashCollected,
      totalUpiCollected,
      totalVerifiedUpi,
      totalUnverifiedUpi,
      totalStationCollection: totalCashCollected + totalVerifiedUpi,
      grandTotalReceived:
        totalPreviouslyPaid + totalCashCollected + totalVerifiedUpi,
      totalRemaining:
        totalPackageAmount -
        (totalPreviouslyPaid + totalCashCollected + totalVerifiedUpi),
      fullyPaid,
      partiallyPaid,
      unpaid,
      cashAwaitingHandover: totalCashCollected - cashHandedOver,
      cashHandedOver,
      cashReconciled,
      collectorCashSummary: Object.values(collectorCashMap),
      collectorUpiSummary: Object.values(collectorUpiMap),
    };

    let filtered = bookingRows;
    if (station)
      filtered = filtered.filter((r) =>
        r.stationPayments.some((p) =>
          p.station?.toLowerCase().includes(station.toLowerCase()),
        ),
      );
    if (collectionStatus)
      filtered = filtered.filter(
        (r) => r.collectionStatus === collectionStatus,
      );
    if (paymentMode)
      filtered = filtered.filter((r) =>
        r.stationPayments.some((p) => p.paymentMode === paymentMode),
      );
    if (salespersonId)
      filtered = filtered.filter((r) => r.salespersonId === salespersonId);
    if (collectorId)
      filtered = filtered.filter((r) =>
        r.stationPayments.some((p) => p.collectedByAdminId === collectorId),
      );
    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.bookingId?.toLowerCase().includes(q) ||
          r.name?.toLowerCase().includes(q) ||
          r.phone?.includes(q) ||
          r.email?.toLowerCase().includes(q),
      );
    }

    return res.json({ success: true, stats, bookings: filtered, handovers });
  } catch (err) {
    console.error("[StationPayment] getDashboard error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/station-payments/accounts ───────────────────────────────────
exports.getAccounts = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const accounts = await prisma.paymentReceivingAccount.findMany({
      where: { tenantId, isActive: true },
      include: {
        linkedAdmin: { select: { id: true, name: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { accountName: "asc" },
    });
    return res.json({ success: true, data: accounts });
  } catch (err) {
    console.error("[StationPayment] getAccounts error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/accounts ──────────────────────────────────
exports.createAccount = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const {
      accountName,
      accountHolderName,
      accountType,
      ownershipType,
      bankName,
      maskedAccountNumber,
      upiId,
      linkedAdminId,
    } = req.body;
    if (!accountName || !accountHolderName || !accountType || !ownershipType)
      return res
        .status(400)
        .json({
          success: false,
          message:
            "accountName, accountHolderName, accountType, ownershipType are required",
        });
    const account = await prisma.paymentReceivingAccount.create({
      data: {
        tenantId,
        accountName,
        accountHolderName,
        accountType,
        ownershipType,
        bankName: bankName || null,
        maskedAccountNumber: maskedAccountNumber || null,
        upiId: upiId || null,
        linkedAdminId: linkedAdminId || null,
        createdByAdminId: req.user?.id,
      },
    });
    return res.status(201).json({ success: true, data: account });
  } catch (err) {
    console.error("[StationPayment] createAccount error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── PATCH /api/station-payments/accounts/:id/approve ─────────────────────
exports.approveAccount = async (req, res) => {
  try {
    const { isApproved, isActive } = req.body;
    const account = await prisma.paymentReceivingAccount.update({
      where: { id: req.params.id },
      data: {
        isApproved: isApproved ?? true,
        isActive: isActive ?? true,
        approvedByAdminId: req.user?.id,
      },
    });
    return res.json({ success: true, data: account });
  } catch (err) {
    console.error("[StationPayment] approveAccount error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/collect ───────────────────────────────────
exports.collect = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const {
      bookingId,
      tripId,
      departureDate,
      station,
      platform,
      paymentMode,
      amount,
      collectedFrom,
      collectedFromMobile,
      collectedAt,
      remarks,
      proofImageUrl,
      utrNumber,
      receivingAccountId,
      customAccountName,
    } = req.body;

    if (
      !bookingId ||
      !tripId ||
      !departureDate ||
      !station ||
      !paymentMode ||
      !amount ||
      !collectedFrom
    )
      return res
        .status(400)
        .json({
          success: false,
          message:
            "bookingId, tripId, departureDate, station, paymentMode, amount, collectedFrom are required",
        });
    if (!["CASH", "UPI"].includes(paymentMode))
      return res
        .status(400)
        .json({ success: false, message: "paymentMode must be CASH or UPI" });
    if (paymentMode === "UPI" && !utrNumber)
      return res
        .status(400)
        .json({
          success: false,
          message: "UTR / Transaction ID is required for UPI payments",
        });
    if (paymentMode === "UPI" && !receivingAccountId && !customAccountName)
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Receiving account or custom account name is required for UPI payments",
        });

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Amount must be a positive number" });

    const booking = await prisma.booking.findFirst({
      where: {
        OR: [{ bookingId }, { id: bookingId }],
      },
    });
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    if (booking.tripId !== tripId) {
      return res.status(400).json({
        success: false,
        message: `Booking ${booking.bookingId} belongs to trip ${booking.tripId}, not ${tripId}`,
      });
    }
    if (!sameIstDay(booking.departureDate, departureDate)) {
      return res.status(400).json({
        success: false,
        message: `Booking ${booking.bookingId} is not on departure ${departureDate}`,
      });
    }

    const canonicalBookingId = booking.bookingId;
    const finalAmount = booking.totalAmount || booking.amount || 0;

    // Remaining must use live cleared sources, not a possibly inflated advancePaid.
    const [existingStation, accountingEntries, opsClientPayments, legacyPayments] =
      await Promise.all([
        prisma.stationPaymentCollection.findMany({
          where: { bookingId: canonicalBookingId },
        }),
        prisma.accountingEntry.findMany({
          where: { bookingId: canonicalBookingId },
          select: { amount: true, status: true },
        }),
        prisma.opsClientPayment.findMany({
          where: { bookingId: { in: [booking.id, canonicalBookingId] } },
        }),
        prisma.payment.findMany({
          where: { bookingId: { in: [booking.id, canonicalBookingId] } },
        }),
      ]);
    const liveBalance = computeEffectivePaid({
      totalAmount: finalAmount,
      opsClientPayments,
      legacyPayments,
      stationPayments: existingStation,
      accountingEntries,
    });
    const currentPaid = liveBalance.paidAmount;
    const currentRemaining = liveBalance.remainingAmount;

    if (parsedAmount > currentRemaining + 0.01)
      return res
        .status(400)
        .json({
          success: false,
          message: `Amount ₹${parsedAmount} exceeds remaining balance of ${fmt(currentRemaining)}`,
        });

    if (paymentMode === "UPI" && utrNumber) {
      const dupUtr = await prisma.stationPaymentCollection.findFirst({
        where: { tenantId, utrNumber },
      });
      if (dupUtr)
        return res
          .status(409)
          .json({
            success: false,
            message: `UTR ${utrNumber} already recorded. Duplicate rejected.`,
          });
    }
    if (paymentMode === "CASH") {
      const sixtySecsAgo = new Date(Date.now() - 60000);
      const dup = await prisma.stationPaymentCollection.findFirst({
        where: {
          tenantId,
          bookingId: canonicalBookingId,
          paymentMode: "CASH",
          amount: parsedAmount,
          collectedByAdminId: req.user?.id,
          createdAt: { gte: sixtySecsAgo },
        },
      });
      if (dup)
        return res
          .status(409)
          .json({
            success: false,
            message: "Duplicate submission detected. Wait 60 seconds.",
          });
    }
    if (paymentMode === "UPI" && receivingAccountId) {
      const acct = await prisma.paymentReceivingAccount.findFirst({
        where: {
          id: receivingAccountId,
          tenantId,
          isActive: true,
          isApproved: true,
        },
      });
      if (!acct)
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Selected receiving account is not active or Finance-approved",
          });
    }

    let finalRemarks = remarks || "";
    if (paymentMode === "UPI" && customAccountName) {
      finalRemarks = `Received in Custom Account: ${customAccountName}${finalRemarks ? " | " + finalRemarks : ""}`;
    }

    const receiptNumber = await generateReceiptNumber(tenantId);
    const isCash = paymentMode === "CASH";
    const newTotalPaid = isCash ? currentPaid + parsedAmount : currentPaid;
    const newRemaining = isCash
      ? Math.max(0, finalAmount - newTotalPaid)
      : currentRemaining;
    const newPaymentStatus = isCash
      ? newRemaining <= 0
        ? "PAID"
        : "PARTIAL"
      : booking.paymentStatus;

    const collection = await prisma.$transaction(async (tx) => {
      const col = await tx.stationPaymentCollection.create({
        data: {
          tenantId,
          receiptNumber,
          bookingId: canonicalBookingId,
          tripId: booking.tripId,
          departureDate: booking.departureDate
            ? new Date(booking.departureDate)
            : new Date(departureDate),
          station,
          platform: platform || null,
          paymentMode,
          amount: parsedAmount,
          previousPaid: currentPaid,
          newTotalPaid: isCash ? newTotalPaid : currentPaid,
          newRemaining,
          paymentStatus: newPaymentStatus,
          collectedByAdminId: req.user?.id,
          collectedAt: collectedAt ? new Date(collectedAt) : new Date(),
          collectedFrom,
          collectedFromMobile: collectedFromMobile || null,
          remarks: finalRemarks || null,
          proofImageUrl: proofImageUrl || null,
          utrNumber: paymentMode === "UPI" ? utrNumber : null,
          receivingAccountId: receivingAccountId || null,
          upiVerificationStatus:
            paymentMode === "UPI" ? "PENDING_VERIFICATION" : null,
          collectionStatus: "COLLECTED",
          emailStatus: "PENDING",
        },
        include: { receivingAccount: true },
      });

      await tx.accountingEntry.create({
        data: {
          tenantId,
          bookingId: canonicalBookingId,
          amount: parsedAmount,
          paymentMode: paymentMode === "CASH" ? "CASH" : "UPI",
          referenceNumber: utrNumber || receiptNumber,
          notes: `Station payment at ${station}. Receipt: ${receiptNumber}`,
          status: isCash ? "APPROVED" : "PENDING",
          salespersonId: req.user?.id,
        },
      });

      if (isCash) {
        await syncBookingBalanceFromSources(tx, booking);
      }

      await tx.bookingActivityLog.create({
        data: {
          bookingId: booking.id,
          action: isCash ? "STATION_CASH_COLLECTED" : "STATION_UPI_RECEIVED",
          details: isCash
            ? `Cash ${fmt(parsedAmount)} at ${station}. Receipt: ${receiptNumber}`
            : `UPI ${fmt(parsedAmount)} (UTR: ${utrNumber}) at ${station}. Pending verification. Receipt: ${receiptNumber}`,
          performedByAdminId: req.user?.id,
        },
      });

      return col;
    });

    // Async email
    setImmediate(async () => {
      try {
        const adminRec = await prisma.admin.findUnique({
          where: { id: req.user?.id },
          select: { name: true },
        });
        const trip = await prisma.trip.findUnique({
          where: { id: tripId },
          select: { title: true },
        });
        const emailStatus = await sendReceiptEmail(
          { ...collection, receivingAccount: collection.receivingAccount },
          booking,
          trip?.title || "Trip",
          adminRec?.name || "Staff",
        );
        await prisma.stationPaymentCollection.update({
          where: { id: collection.id },
          data: {
            emailStatus,
            emailSentAt: emailStatus === "SENT" ? new Date() : null,
          },
        });
      } catch (e) {
        console.error("[StationPayment] Async email error:", e);
      }
    });

    return res.status(201).json({
      success: true,
      data: collection,
      message: isCash
        ? `Cash ${fmt(parsedAmount)} recorded. Receipt: ${receiptNumber}`
        : `UPI ${fmt(parsedAmount)} recorded. Pending Finance verification. Receipt: ${receiptNumber}`,
    });
  } catch (err) {
    console.error("[StationPayment] collect error:", err);
    if (err.code === "P2002")
      return res
        .status(409)
        .json({
          success: false,
          message:
            "Duplicate UTR number. This transaction was already recorded.",
        });
    return res
      .status(500)
      .json({ success: false, message: "Server error: " + err.message });
  }
};

// ─── GET /api/station-payments/:id ────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const record = await prisma.stationPaymentCollection.findUnique({
      where: { id: req.params.id },
      include: {
        receivingAccount: true,
        collectedBy: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
        reversedBy: { select: { id: true, name: true } },
        handover: true,
      },
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    return res.json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/:id/cancel ────────────────────────────────
exports.cancel = async (req, res) => {
  try {
    const { reversalReason } = req.body;
    if (!reversalReason)
      return res
        .status(400)
        .json({ success: false, message: "reversalReason is required" });
    const record = await prisma.stationPaymentCollection.findUnique({
      where: { id: req.params.id },
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "Record not found" });
    if (record.isReversed)
      return res
        .status(409)
        .json({ success: false, message: "Already reversed" });
    const booking = await prisma.booking.findUnique({
      where: { bookingId: record.bookingId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.stationPaymentCollection.update({
        where: { id: record.id },
        data: {
          collectionStatus: "REVERSED",
          isReversed: true,
          reversedAt: new Date(),
          reversedByAdminId: req.user?.id,
          reversalReason,
        },
      });
      await rejectStationAccountingEntries(tx, record);
      if (booking) {
        await syncBookingBalanceFromSources(tx, booking);
        await tx.bookingActivityLog.create({
          data: {
            bookingId: booking.id,
            action: "STATION_PAYMENT_REVERSED",
            details: `${record.receiptNumber} reversed. Reason: ${reversalReason}`,
            performedByAdminId: req.user?.id,
          },
        });
      }
    });
    return res.json({ success: true, message: "Reversed successfully" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/:id/verify-upi ────────────────────────────
exports.verifyUpi = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;
    const record = await prisma.stationPaymentCollection.findUnique({
      where: { id: req.params.id },
      include: { receivingAccount: true },
    });
    if (!record)
      return res.status(404).json({ success: false, message: "Not found" });
    if (record.paymentMode !== "UPI")
      return res
        .status(400)
        .json({
          success: false,
          message: "Only UPI station payments can be verified here",
        });
    if (record.isReversed || record.collectionStatus === "REVERSED")
      return res
        .status(409)
        .json({ success: false, message: "Payment already reversed" });
    if (record.upiVerificationStatus === "VERIFIED" && action === "VERIFY")
      return res
        .status(409)
        .json({ success: false, message: "UPI payment already verified" });
    if (
      record.upiVerificationStatus === "REJECTED" ||
      record.collectionStatus === "CANCELLED"
    )
      return res
        .status(409)
        .json({ success: false, message: "UPI payment already rejected" });

    const userRole = (req.user?.role || "").toUpperCase().replace(/[-\s]/g, "_");
    const isPrivileged = [
      "SUPER_ADMIN",
      "ADMIN",
      "FINANCE",
      "FINANCE_CONTROLLER",
      "OPS_HEAD",
      "OPERATIONS",
      "OPERATIONS_STAFF",
      "OPS",
      "MANAGER",
      "FOUNDER",
    ].includes(userRole);
    if (record.collectedByAdminId === req.user?.id && !isPrivileged)
      return res
        .status(403)
        .json({ success: false, message: "Cannot verify your own collection" });

    const isVerify = action === "VERIFY";
    const booking = await prisma.booking.findUnique({
      where: { bookingId: record.bookingId },
    });

    await prisma.$transaction(async (tx) => {
      await tx.stationPaymentCollection.update({
        where: { id: record.id },
        data: {
          upiVerificationStatus: isVerify ? "VERIFIED" : "REJECTED",
          collectionStatus: isVerify
            ? "COLLECTED"
            : action === "REJECT"
              ? "CANCELLED"
              : record.collectionStatus,
          verifiedByAdminId: req.user?.id,
          verifiedAt: isVerify ? new Date() : null,
          remarks:
            !isVerify && rejectionReason
              ? `${record.remarks ? record.remarks + " | " : ""}Rejected: ${rejectionReason}`
              : record.remarks,
        },
      });

      if (!isVerify) {
        await rejectStationAccountingEntries(tx, record);
      } else {
        await tx.accountingEntry.updateMany({
          where: {
            bookingId: record.bookingId,
            referenceNumber: record.utrNumber || record.receiptNumber,
            status: "PENDING",
          },
          data: { status: "APPROVED", actionedById: req.user?.id },
        });
      }

      if (booking) {
        const updatedBooking = await syncBookingBalanceFromSources(tx, booking);
        await tx.stationPaymentCollection.update({
          where: { id: record.id },
          data: {
            newTotalPaid: updatedBooking?.advancePaid ?? record.newTotalPaid,
            newRemaining: updatedBooking?.remainingAmount ?? record.newRemaining,
            paymentStatus: updatedBooking?.paymentStatus || record.paymentStatus,
          },
        });
        await tx.bookingActivityLog.create({
          data: {
            bookingId: booking.id,
            action: isVerify ? "STATION_UPI_VERIFIED" : "STATION_UPI_REJECTED",
            details: isVerify
              ? `UPI ${record.receiptNumber} verified. Balance updated.`
              : `UPI ${record.receiptNumber} rejected. Reason: ${rejectionReason || "Not specified"}`,
            performedByAdminId: req.user?.id,
          },
        });
      }
    });
    return res.json({
      success: true,
      message: isVerify ? "Verified. Booking balance updated." : "Rejected.",
    });
  } catch (err) {
    console.error("[StationPayment] verifyUpi error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/:id/resend-email ──────────────────────────
exports.resendEmail = async (req, res) => {
  try {
    const record = await prisma.stationPaymentCollection.findUnique({
      where: { id: req.params.id },
      include: { receivingAccount: true },
    });
    if (!record)
      return res.status(404).json({ success: false, message: "Not found" });
    const booking = await prisma.booking.findUnique({
      where: { bookingId: record.bookingId },
    });
    const trip = await prisma.trip.findUnique({
      where: { id: record.tripId },
      select: { title: true },
    });
    const admin = await prisma.admin.findUnique({
      where: { id: record.collectedByAdminId },
      select: { name: true },
    });
    const emailStatus = await sendReceiptEmail(
      record,
      booking,
      trip?.title || "Trip",
      admin?.name || "Staff",
    );
    await prisma.stationPaymentCollection.update({
      where: { id: record.id },
      data: {
        emailStatus,
        emailSentAt: emailStatus === "SENT" ? new Date() : null,
      },
    });
    return res.json({
      success: true,
      message: emailStatus === "SENT" ? "Email resent" : "Email failed",
    });
  } catch (err) {
    console.error("Error in resendEmail:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/station-payments/receipt/:id ────────────────────────────────
exports.getReceipt = async (req, res) => {
  try {
    const record = await prisma.stationPaymentCollection.findUnique({
      where: { id: req.params.id },
      include: {
        receivingAccount: true,
        collectedBy: { select: { id: true, name: true } },
        verifiedBy: { select: { id: true, name: true } },
      },
    });
    if (!record)
      return res.status(404).json({ success: false, message: "Not found" });
    const booking = await prisma.booking.findUnique({
      where: { bookingId: record.bookingId },
    });
    const trip = await prisma.trip.findUnique({
      where: { id: record.tripId },
      select: { title: true },
    });
    return res.json({
      success: true,
      data: { collection: record, booking, tripName: trip?.title },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/handover ──────────────────────────────────
exports.createHandover = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const {
      tripId,
      departureDate,
      station,
      amountHandedOver,
      handoverRecipientId,
      handoverReference,
      remarks,
    } = req.body;
    if (
      !tripId ||
      !departureDate ||
      !station ||
      !amountHandedOver ||
      !handoverRecipientId
    )
      return res
        .status(400)
        .json({
          success: false,
          message:
            "tripId, departureDate, station, amountHandedOver, handoverRecipientId required",
        });
    if (handoverRecipientId === req.user?.id)
      return res
        .status(400)
        .json({ success: false, message: "Cannot be your own recipient" });

    const cashSum = await prisma.stationPaymentCollection.aggregate({
      where: {
        tenantId,
        tripId,
        departureDate: new Date(departureDate),
        paymentMode: "CASH",
        collectionStatus: "COLLECTED",
        collectedByAdminId: req.user?.id,
        handoverId: null,
      },
      _sum: { amount: true },
    });
    const amountExpected = cashSum._sum.amount || 0;
    const handedOver = parseFloat(amountHandedOver);

    const handover = await prisma.$transaction(async (tx) => {
      const h = await tx.stationCashHandover.create({
        data: {
          tenantId,
          collectorId: req.user?.id,
          tripId,
          departureDate: new Date(departureDate),
          station,
          amountExpected,
          amountHandedOver: handedOver,
          handoverRecipientId,
          handoverReference: handoverReference || null,
          remarks: remarks || null,
          shortageAmount: Math.max(0, amountExpected - handedOver),
          excessAmount: Math.max(0, handedOver - amountExpected),
          handoverStatus: "HANDED_OVER",
          handoverAt: new Date(),
        },
      });
      await tx.stationPaymentCollection.updateMany({
        where: {
          tenantId,
          tripId,
          departureDate: new Date(departureDate),
          paymentMode: "CASH",
          collectionStatus: "COLLECTED",
          collectedByAdminId: req.user?.id,
          handoverId: null,
        },
        data: { handoverId: h.id },
      });
      return h;
    });
    return res.status(201).json({ success: true, data: handover });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/handover/:id/confirm ─────────────────────
exports.confirmHandover = async (req, res) => {
  try {
    const handover = await prisma.stationCashHandover.findUnique({
      where: { id: req.params.id },
    });
    if (!handover)
      return res.status(404).json({ success: false, message: "Not found" });
    if (handover.collectorId === req.user?.id)
      return res
        .status(403)
        .json({ success: false, message: "Cannot confirm your own handover" });
    await prisma.stationCashHandover.update({
      where: { id: req.params.id },
      data: {
        handoverStatus: "CONFIRMED",
        financeConfirmedById: req.user?.id,
        financeConfirmedAt: new Date(),
      },
    });
    return res.json({ success: true, message: "Handover confirmed" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── POST /api/station-payments/handover/:id/reconcile ───────────────────
exports.reconcileHandover = async (req, res) => {
  try {
    const handover = await prisma.stationCashHandover.findUnique({
      where: { id: req.params.id },
    });
    if (!handover)
      return res.status(404).json({ success: false, message: "Not found" });
    if (handover.collectorId === req.user?.id)
      return res
        .status(403)
        .json({
          success: false,
          message: "Cannot reconcile your own handover",
        });
    if (handover.handoverStatus !== "CONFIRMED")
      return res
        .status(400)
        .json({
          success: false,
          message: "Must be CONFIRMED before reconciliation",
        });
    await prisma.stationCashHandover.update({
      where: { id: req.params.id },
      data: {
        handoverStatus: "RECONCILED",
        reconciledById: req.user?.id,
        reconciledAt: new Date(),
      },
    });
    return res.json({ success: true, message: "Reconciled" });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─── GET /api/station-payments/reports ────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const { tripId, departureDate, from, to } = req.query;
    const where = { tenantId, collectionStatus: { not: "CANCELLED" } };
    if (tripId) where.tripId = tripId;
    if (departureDate) where.departureDate = new Date(departureDate);
    if (from && to)
      where.collectedAt = { gte: new Date(from), lte: new Date(to) };

    const collections = await prisma.stationPaymentCollection.findMany({
      where,
      include: {
        receivingAccount: {
          select: { accountName: true, ownershipType: true },
        },
        collectedBy: { select: { name: true } },
      },
      orderBy: { collectedAt: "desc" },
    });

    let cashTotal = 0,
      upiTotal = 0,
      upiVerified = 0,
      upiPending = 0;
    const byAccount = {},
      byCollector = {};
    for (const c of collections) {
      if (c.paymentMode === "CASH") {
        cashTotal += c.amount;
      } else {
        upiTotal += c.amount;
        if (c.upiVerificationStatus === "VERIFIED") upiVerified += c.amount;
        else if (c.upiVerificationStatus === "PENDING_VERIFICATION")
          upiPending += c.amount;
      }
      if (c.paymentMode === "UPI") {
        const k = c.receivingAccountId || "unknown";
        if (!byAccount[k])
          byAccount[k] = {
            accountName: c.receivingAccount?.accountName || "Unknown",
            ownershipType: c.receivingAccount?.ownershipType,
            amount: 0,
            verified: 0,
            pending: 0,
          };
        byAccount[k].amount += c.amount;
        if (c.upiVerificationStatus === "VERIFIED")
          byAccount[k].verified += c.amount;
        if (c.upiVerificationStatus === "PENDING_VERIFICATION")
          byAccount[k].pending += c.amount;
      }
      const ck = c.collectedByAdminId;
      if (!byCollector[ck])
        byCollector[ck] = {
          name: c.collectedBy?.name || ck,
          cash: 0,
          upi: 0,
          verifiedUpi: 0,
        };
      if (c.paymentMode === "CASH") byCollector[ck].cash += c.amount;
      else {
        byCollector[ck].upi += c.amount;
        if (c.upiVerificationStatus === "VERIFIED")
          byCollector[ck].verifiedUpi += c.amount;
      }
    }
    return res.json({
      success: true,
      data: {
        summary: {
          cashTotal,
          upiTotal,
          upiVerified,
          upiPending,
          grandTotal: cashTotal + upiVerified,
        },
        byAccount: Object.values(byAccount),
        byCollector: Object.values(byCollector),
        collections,
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

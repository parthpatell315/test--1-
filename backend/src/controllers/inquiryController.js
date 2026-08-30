const { prisma } = require("../lib/prisma");
const { logAction } = require("../utils/auditLogger");

/**
 * @desc    Submit inquiry (Public / Link attribution)
 * @route   POST /api/inquiries
 * @access  Public
 */
exports.createInquiry = async (req, res, next) => {
  try {
    const tenantId = req.headers["x-tenant-id"] || "default";
    const phone = String(req.body.phone || req.body.mobile || "").trim();
    let tripId = req.body.tripId || req.body.destinationId || null;
    let tripTitle =
      req.body.tripTitle ||
      req.body.destinationName ||
      req.body.destination ||
      req.body.tripName ||
      null;
    const sourceBookingLinkId = req.body.sourceBookingLinkId || null;

    // If tripId is provided but no tripTitle, or vice versa, try finding trip details
    if (tripId && !tripTitle) {
      const trip = await prisma.trip.findFirst({
        where: { OR: [{ id: tripId }, { tripCode: tripId }, { slug: tripId }] },
        select: { id: true, title: true, tripCode: true },
      });
      if (trip) {
        tripTitle = trip.title;
        tripId = trip.tripCode || trip.id;
      }
    } else if (!tripId && tripTitle) {
      const trip = await prisma.trip.findFirst({
        where: { OR: [{ title: { equals: tripTitle, mode: "insensitive" } }, { slug: tripTitle.toLowerCase().replace(/\s+/g, "-") }] },
        select: { id: true, title: true, tripCode: true },
      });
      if (trip) {
        tripId = trip.tripCode || trip.id;
        tripTitle = trip.title;
      }
    }

    // Check for duplicates in the last 48 hours
    const duplicate = await prisma.inquiry.findFirst({
      where: {
        phone: phone || undefined,
        tripId: tripId || undefined,
        tenantId,
        createdAt: { gte: new Date(Date.now() - 48 * 60 * 60 * 1000) },
      },
    });

    // Resolve salesAdminId attribution
    let salesAdminId = null;
    if (sourceBookingLinkId) {
      const link = await prisma.bookingLink.findUnique({
        where: { id: sourceBookingLinkId },
      });
      if (link) {
        salesAdminId = link.createdByAdminId;
      }
    } else if (req.user) {
      if (req.user.role === "sales") {
        salesAdminId = req.user.id;
      } else if (req.body.salesAdminId) {
        salesAdminId = req.body.salesAdminId;
      }
    }

    const date = req.body.date || req.body.preferredDate || null;
    const count = req.body.count
      ? parseInt(req.body.count)
      : req.body.numberOfTravelers
        ? parseInt(req.body.numberOfTravelers)
        : req.body.pax
          ? parseInt(req.body.pax)
          : undefined;
    const city = req.body.city || "";
    let message = req.body.message || "";
    if (city && !message.toLowerCase().includes(city.toLowerCase())) {
      message = message ? `City: ${city}\n${message}` : `City: ${city}`;
    }

    const inquiry = await prisma.inquiry.create({
      data: {
        name: req.body.name || "Website Lead",
        email: req.body.email || null,
        phone: phone || null,
        message: message || null,
        tripId: tripId || null,
        tripTitle: tripTitle || null,
        date: date || null,
        source: req.body.source || "Website Inquiry",
        adminNotes: `Source: ${req.body.source || "Website"}${city ? ` · City: ${city}` : ""}`,
        tenantId,
        salesAdminId,
        count: isNaN(count) ? undefined : count,
      },
    });

    const { publishEvent } = require("../utils/eventBus");
    await publishEvent("inquiry.created", {
      entityType: "Inquiry",
      entityId: inquiry.id,
      actorUserId: salesAdminId || "system",
      actorName: req.body.name || "System",
      title: `New Inquiry Created`,
      description: `Inquiry for ${tripTitle || "Tour"} from ${req.body.name || phone || "Lead"}`,
      moduleName: "Sales",
      priority: "Medium",
      actionUrl: `/admin/inquiries`,
      notify: true,
      assigneeId: salesAdminId,
    });

    res
      .status(201)
      .json({ success: true, data: inquiry, isDuplicate: !!duplicate });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all inquiries (Scoped by tenantId)
 * @route   GET /api/inquiries
 * @access  Private/Admin
 */
exports.getInquiries = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { status, search } = req.query;

    // 1. Pagination parameters parse
    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(page) || page < 1) page = 1;
    if (isNaN(limit) || limit < 1) limit = 25;
    if (limit > 100) limit = 100;
    const skip = (page - 1) * limit;

    const where = { tenantId };

    // 2. Map status filters
    if (status) {
      if (status === "all") {
        where.status = { in: ["new", "contacted", "read"] };
      } else if (status === "new") {
        where.status = { in: ["new", "read"] };
      } else {
        where.status = status;
      }
    }

    // Search query map
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { tripTitle: { contains: search, mode: "insensitive" } },
      ];
    }

    // 3. Database query parallel execution
    const [totalCount, inquiries] = await Promise.all([
      prisma.inquiry.count({ where }),
      prisma.inquiry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    const mappedInquiries = inquiries.map((inq) => ({
      ...inq,
      read: inq.status !== "new",
    }));

    res.json({
      success: true,
      count: mappedInquiries.length,
      data: mappedInquiries,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inquiry status/notes
 * @route   PATCH /api/inquiries/:id/status
 * @access  Private/Admin
 */
exports.updateInquiryStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { status, adminNotes } = req.body;

    const where = { id, tenantId };
    if (req.user?.role === "sales") {
      where.salesAdminId = req.user.id;
    }

    const beforeInquiry = await prisma.inquiry.findFirst({ where });
    if (!beforeInquiry) {
      return res
        .status(404)
        .json({ success: false, message: "Inquiry not found" });
    }

    await prisma.inquiry.updateMany({
      where,
      data: { status, adminNotes },
    });

    const afterInquiry = await prisma.inquiry.findFirst({ where });

    if (status !== beforeInquiry.status) {
      const { publishEvent } = require("../utils/eventBus");
      await publishEvent("inquiry.status_updated", {
        entityType: "Inquiry",
        entityId: id,
        actorUserId: req.user.id,
        actorName: req.user.name || "Admin",
        title: `Inquiry status changed to ${status}`,
        description: `Previous status: ${beforeInquiry.status}`,
        moduleName: "Sales",
        priority: "Low",
        actionUrl: `/admin/inquiries/${id}`,
        notify: false,
        audit: {
          action: "STATUS_UPDATE",
          beforeData: { status: beforeInquiry.status },
          afterData: { status: afterInquiry.status },
        },
      });
    }

    res.json({ success: true, message: "Inquiry updated" });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single inquiry
 * @route   GET /api/inquiries/:id
 */
exports.getInquiry = async (req, res, next) => {
  try {
    const where = { id: req.params.id, tenantId: req.user.tenantId };
    if (req.user?.role === "sales") {
      where.salesAdminId = req.user.id;
    }

    const inquiry = await prisma.inquiry.findFirst({ where });
    if (!inquiry)
      return res
        .status(404)
        .json({ success: false, message: "Inquiry not found" });

    const mappedInquiry = {
      ...inquiry,
      read: inquiry.status !== "new",
    };

    res.json({ success: true, data: mappedInquiry });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete inquiry
 * @route   DELETE /api/inquiries/:id
 */
exports.deleteInquiry = async (req, res, next) => {
  try {
    const where = { id: req.params.id, tenantId: req.user.tenantId };
    if (req.user?.role === "sales") {
      where.salesAdminId = req.user.id;
    }

    const inquiry = await prisma.inquiry.findFirst({ where });
    if (!inquiry)
      return res
        .status(404)
        .json({ success: false, message: "Inquiry not found" });

    await prisma.inquiry.deleteMany({ where });
    res.json({ success: true, message: "Inquiry deleted" });
  } catch (error) {
    next(error);
  }
};

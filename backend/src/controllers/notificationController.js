const { prisma } = require("../lib/prisma");

// Helper to create a notification easily from anywhere in backend
exports.createNotification = async ({
  tenantId = "default",
  userId,
  title,
  message,
  link = null,
}) => {
  try {
    if (!userId) {
      const admins = await prisma.admin.findMany({
        where: { tenantId, isActive: true },
        select: { id: true },
      });
      if (admins.length > 0 && prisma.notification) {
        return await prisma.notification.createMany({
          data: admins.map((a) => ({
            tenantId,
            userId: a.id,
            title,
            message,
            link,
          })),
        });
      }
      return null;
    }

    if (prisma.notification) {
      return await prisma.notification.create({
        data: {
          tenantId,
          userId,
          title,
          message,
          link,
        },
      });
    }
    return null;
  } catch (err) {
    console.error("createNotification error:", err);
    return null;
  }
};

// Get all notifications for authenticated user
exports.getNotifications = async (req, res, next) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const userId = req.user?.id;

    // 1. Fetch user-specific notifications from DB
    let dbNotifications = [];
    try {
      if (prisma.notification) {
        const notifWhere = { tenantId };
        if (userId) notifWhere.userId = userId;
        dbNotifications = await prisma.notification.findMany({
          where: notifWhere,
          orderBy: {
            createdAt: "desc",
          },
          take: 40,
        });
      }
    } catch (err) {
      console.warn("DB notification fetch warn:", err.message);
    }

    // 2. Fetch pending operational items to synthesize live alerts safely
    const liveAlerts = [];

    // Check pending client payments needing verification
    try {
      if (prisma.opsClientPayment) {
        const pendingPayments = await prisma.opsClientPayment.findMany({
          where: {
            tenantId,
            status: { in: ["Pending", "PENDING", "Unverified"] },
          },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        pendingPayments.forEach((p) => {
          liveAlerts.push({
            id: `live-pay-${p.id}`,
            title: "💰 Payment Verification",
            message: `₹${Number(p.amount || 0).toLocaleString("en-IN")} via ${p.paymentMode || "Online"} for Booking ${p.bookingId || "—"} awaiting verification`,
            link: "/admin/approval-center/incoming",
            type: "PAYMENT",
            isRead: false,
            createdAt: p.createdAt,
          });
        });
      }
    } catch (err) {
      // safe fallback
    }

    // Check pending train tickets
    try {
      if (prisma.trainTicketRequest) {
        const pendingTickets = await prisma.trainTicketRequest.findMany({
          where: { tenantId, status: { in: ["PENDING", "UNDER_REVIEW"] } },
          include: { booking: { select: { bookingId: true, name: true } } },
          take: 5,
          orderBy: { createdAt: "desc" },
        });

        pendingTickets.forEach((t) => {
          liveAlerts.push({
            id: `live-ticket-${t.id}`,
            title: "🎫 Train Ticket Queue",
            message: `${t.numberOfPassengers || 1} Pax for ${t.booking?.name || t.trainNumber || "Booking"} awaiting PNR assignment`,
            link: "/admin/bookings",
            type: "TICKETING",
            isRead: false,
            createdAt: t.createdAt,
          });
        });
      }
    } catch (err) {
      // safe fallback
    }

    // Merge and sort
    const all = [...dbNotifications, ...liveAlerts].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    return res.json(all);
  } catch (error) {
    console.error("getNotifications error:", error);
    return res.json([]);
  }
};

// Mark a single notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (id.startsWith("live-")) {
      // Dynamic live alert, return success
      return res.json({ success: true, id, isRead: true });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification not found" });
    }

    if (notification.userId !== req.user.id) {
      return res.status(403).json({ error: "Access denied" });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read for the authenticated user
exports.markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
        isRead: false,
      },
      data: { isRead: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

// Create a test notification for the current user
exports.sendTestNotification = async (req, res, next) => {
  try {
    const notif = await prisma.notification.create({
      data: {
        tenantId: req.user.tenantId || "default",
        userId: req.user.id,
        title: "🔔 Test Notification Chime",
        message: "Your YouthCamping OS notification bell is working perfectly in real-time!",
        link: "/admin/dashboard",
      },
    });
    res.json({ success: true, data: notif });
  } catch (error) {
    next(error);
  }
};

// Clear all notifications
exports.clearAll = async (req, res, next) => {
  try {
    await prisma.notification.deleteMany({
      where: {
        tenantId: req.user.tenantId,
        userId: req.user.id,
      },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

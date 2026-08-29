const { prisma } = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const { logAction } = require("../utils/auditLogger");
const cache = require("../lib/cache");

const usersCache = new Map(); // tenantId -> { data, expiresAt }
const USERS_CACHE_TTL = 5 * 60 * 1000;

// Verification: Allow superadmin and admin users to access & modify Staff Profiles & Role Management
const isFounderAccess = (user) => {
  if (!user) return false;
  return user.role === "superadmin" || user.role === "admin";
};

// @desc    List all admin users
// @route   GET /api/admin/users
// @access  Private (Authenticated users)
exports.listUsers = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || "default";
    const cached = usersCache.get(tenantId);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ success: true, data: cached.data });
    }

    const users = await prisma.admin.findMany({
      where: { tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        customPermissions: true,
        isActive: true,
        tokenVersion: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    usersCache.set(tenantId, {
      data: users,
      expiresAt: Date.now() + USERS_CACHE_TTL,
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active sales executive user options (for dropdown filters)
// @route   GET /api/admin/users/sales-executives
// @access  Private (Authenticated staff)
exports.getSalesExecutives = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId || "default";
    const users = await prisma.admin.findMany({
      where: { tenantId, isActive: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// @desc    Create a new admin user (Founder Hemal Patel only)
// @route   POST /api/admin/users
// @access  Private (Founder only)
exports.createUser = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is strictly restricted to Hemal Patel (Founder).",
        });
    }
    const { name, email, role, password, customPermissions } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    if (!name || !email || !role || !password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Please provide all required fields",
        });
    }

    const submittedEmail = email.toLowerCase().trim();

    // Check if email already exists
    const existing = await prisma.admin.findUnique({
      where: { email: submittedEmail },
    });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Email address is already in use" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await prisma.admin.create({
      data: {
        name,
        email: submittedEmail,
        role,
        customPermissions: customPermissions || [],
        password: passwordHash,
        tenantId: req.user.tenantId || "default",
      },
    });

    usersCache.delete(req.user.tenantId || "default");

    await logAction({
      tenantId: req.user.tenantId,
      actorUserId: req.user.id,
      action: "user_created",
      entityType: "admin",
      entityId: newUser.id,
      afterData: { name, email: submittedEmail, role, customPermissions },
      ipAddress,
    });

    const userResponse = { ...newUser };
    delete userResponse.password;

    res.status(201).json({ success: true, data: userResponse });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an admin's role (Founder Hemal Patel only)
// @route   PUT /api/admin/users/:id/role
// @access  Private (Founder only)
exports.updateUserRole = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is strictly restricted to Hemal Patel (Founder).",
        });
    }
    const { role, customPermissions } = req.body;
    const targetUserId = req.params.id;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    if (!role) {
      return res
        .status(400)
        .json({ success: false, message: "Role is required" });
    }

    const targetUser = await prisma.admin.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "Admin user not found" });
    }

    const updateData = { role };
    if (customPermissions !== undefined) {
      updateData.customPermissions = customPermissions;
    }

    const updatedUser = await prisma.admin.update({
      where: { id: targetUserId },
      data: updateData,
    });

    await cache.del(`auth:${targetUserId}`);
    usersCache.delete(req.user.tenantId || "default");

    await logAction({
      tenantId: req.user.tenantId,
      actorUserId: req.user.id,
      action: "role_change",
      entityType: "admin",
      entityId: targetUserId,
      beforeData: {
        role: targetUser.role,
        customPermissions: targetUser.customPermissions,
      },
      afterData: { role, customPermissions: updatedUser.customPermissions },
      ipAddress,
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        role: updatedUser.role,
        customPermissions: updatedUser.customPermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update an admin's custom permissions & role (Founder Hemal Patel only)
// @route   PUT /api/admin/users/:id/permissions
// @access  Private (Founder only)
exports.updateUserPermissions = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is strictly restricted to Hemal Patel (Founder).",
        });
    }
    const { role, customPermissions } = req.body;
    const targetUserId = req.params.id;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    const targetUser = await prisma.admin.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "Admin user not found" });
    }

    const updateData = {};
    if (role !== undefined) updateData.role = role;
    if (customPermissions !== undefined)
      updateData.customPermissions = customPermissions;

    const updatedUser = await prisma.admin.update({
      where: { id: targetUserId },
      data: updateData,
    });

    // Sync Enterprise RBAC UserRoleAssignment and UserCustomPermission tables
    try {
      if (role !== undefined) {
        const roleObj = await prisma.role.findFirst({
          where: { name: { equals: role, mode: "insensitive" } },
        });
        if (roleObj) {
          await prisma.userRoleAssignment.upsert({
            where: {
              userId_roleId: { userId: targetUserId, roleId: roleObj.id },
            },
            create: {
              tenantId: req.user.tenantId || "default",
              userId: targetUserId,
              roleId: roleObj.id,
              assignedBy: req.user.id,
            },
            update: {},
          });
        }
      }

      if (Array.isArray(customPermissions)) {
        for (const pKey of customPermissions) {
          const permObj = await prisma.permission.findFirst({
            where: { key: pKey },
          });
          if (permObj) {
            await prisma.userCustomPermission.upsert({
              where: {
                userId_permissionId: {
                  userId: targetUserId,
                  permissionId: permObj.id,
                },
              },
              create: {
                tenantId: req.user.tenantId || "default",
                userId: targetUserId,
                permissionId: permObj.id,
                isGranted: true,
                grantedBy: req.user.id,
              },
              update: { isGranted: true, grantedBy: req.user.id },
            });
          }
        }
      }
    } catch (e) {
      console.warn("Enterprise RBAC table sync warning:", e.message);
    }

    await cache.del(`auth:${targetUserId}`);
    usersCache.delete(req.user.tenantId || "default");

    await logAction({
      tenantId: req.user.tenantId,
      actorUserId: req.user.id,
      action: "permissions_update",
      entityType: "admin",
      entityId: targetUserId,
      beforeData: {
        role: targetUser.role,
        customPermissions: targetUser.customPermissions,
      },
      afterData: {
        role: updatedUser.role,
        customPermissions: updatedUser.customPermissions,
      },
      ipAddress,
    });

    res.json({
      success: true,
      data: {
        id: updatedUser.id,
        role: updatedUser.role,
        customPermissions: updatedUser.customPermissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle user active status (Founder Hemal Patel only)
// @route   PUT /api/admin/users/:id/toggle-active
// @access  Private (Founder only)
exports.toggleUserActive = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is strictly restricted to Hemal Patel (Founder).",
        });
    }
    const targetUserId = req.params.id;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    const targetUser = await prisma.admin.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "Admin user not found" });
    }

    const nextActive = !targetUser.isActive;
    const updatedUser = await prisma.admin.update({
      where: { id: targetUserId },
      data: {
        isActive: nextActive,
        tokenVersion: { increment: 1 }, // Invalidate tokens
      },
    });

    await logAction({
      tenantId: req.user.tenantId,
      actorUserId: req.user.id,
      action: nextActive ? "user_reactivated" : "user_deactivated",
      entityType: "admin",
      entityId: targetUserId,
      beforeData: { isActive: targetUser.isActive },
      afterData: { isActive: nextActive },
      ipAddress,
    });

    res.json({
      success: true,
      data: { id: updatedUser.id, isActive: updatedUser.isActive },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Reset admin user password (Founder Hemal Patel only)
// @route   PUT /api/admin/users/:id/reset-password
// @access  Private (Founder only)
exports.resetUserPassword = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is strictly restricted to Hemal Patel (Founder).",
        });
    }
    const { password } = req.body;
    const targetUserId = req.params.id;
    const ipAddress = req.ip || req.connection.remoteAddress || null;

    if (!password || password.length < 4) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Password must be at least 4 characters long",
        });
    }

    const targetUser = await prisma.admin.findUnique({
      where: { id: targetUserId },
    });
    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "Admin user not found" });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    await prisma.admin.update({
      where: { id: targetUserId },
      data: {
        password: passwordHash,
        tokenVersion: { increment: 1 }, // Invalidate tokens
      },
    });

    await logAction({
      tenantId: req.user.tenantId,
      actorUserId: req.user.id,
      action: "password_reset",
      entityType: "admin",
      entityId: targetUserId,
      ipAddress,
    });

    res.json({
      success: true,
      message: "Password has been reset successfully",
    });
  } catch (error) {
    next(error);
  }
};

// @desc    List Audit Logs (Founder Hemal Patel only)
// @route   GET /api/admin/audit-logs
// @access  Private (Founder only)
exports.listAuditLogs = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Audit Logs are strictly restricted to Hemal Patel (Founder).",
        });
    }
    const logs = await prisma.auditLog.findMany({
      where: {
        tenantId: req.user.tenantId,
      },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    const actorUserIds = [
      ...new Set(logs.map((l) => l.actorUserId).filter(Boolean)),
    ];
    const admins = await prisma.admin.findMany({
      where: { id: { in: actorUserIds } },
      select: { id: true, name: true, email: true, role: true },
    });

    const adminMap = new Map(admins.map((a) => [a.id, a]));

    const enrichedLogs = logs.map((log) => {
      const actorInfo = log.actorUserId ? adminMap.get(log.actorUserId) : null;
      return {
        ...log,
        actor: actorInfo
          ? {
              id: actorInfo.id,
              name: actorInfo.name || actorInfo.email.split("@")[0],
              email: actorInfo.email,
              role: actorInfo.role || "admin",
            }
          : {
              id: log.actorUserId || "system",
              name: log.actorUserId ? "Admin User" : "Automated System",
              email: "system@youthcamping.online",
              role: "system",
            },
      };
    });

    res.json({ success: true, data: enrichedLogs });
  } catch (error) {
    next(error);
  }
};

// @desc    Permanently Delete User Profile (Founder Hemal Patel / Super User only)
// @route   DELETE /api/admin/users/:id
// @access  Private (Founder / Super Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    if (!isFounderAccess(req.user)) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Permanent profile deletion is strictly restricted to Founder / Super User.",
        });
    }

    const targetUserId = req.params.id;

    if (targetUserId === req.user.id) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot delete your own superuser account",
        });
    }

    const targetUser = await prisma.admin.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found" });
    }

    // Unlink / clean up foreign key references in a transaction before deleting
    await prisma.$transaction([
      // Unlink sales references
      prisma.booking.updateMany({ where: { salesAdminId: targetUserId }, data: { salesAdminId: null } }),
      prisma.bookingLink.updateMany({ where: { salesAdminId: targetUserId }, data: { salesAdminId: null } }),
      prisma.inquiry.updateMany({ where: { salesAdminId: targetUserId }, data: { salesAdminId: null } }),
      prisma.quotation.updateMany({ where: { salesAdminId: targetUserId }, data: { salesAdminId: null } }),
      
      // Unlink accounting entries
      prisma.accountingEntry.updateMany({ where: { salespersonId: targetUserId }, data: { salespersonId: null } }),
      prisma.accountingEntry.updateMany({ where: { actionedByUserId: targetUserId }, data: { actionedByUserId: null } }),
      
      // Unlink station payments
      prisma.stationPaymentCollection.updateMany({ where: { collectedByAdminId: targetUserId }, data: { collectedByAdminId: null } }),
      prisma.stationPaymentCollection.updateMany({ where: { reversedByAdminId: targetUserId }, data: { reversedByAdminId: null } }),
      prisma.stationPaymentCollection.updateMany({ where: { verifiedByAdminId: targetUserId }, data: { verifiedByAdminId: null } }),
      
      // Unlink cash handovers
      prisma.stationCashHandover.updateMany({ where: { collectorAdminId: targetUserId }, data: { collectorAdminId: null } }),
      prisma.stationCashHandover.updateMany({ where: { recipientAdminId: targetUserId }, data: { recipientAdminId: null } }),
      prisma.stationCashHandover.updateMany({ where: { financeConfirmAdminId: targetUserId }, data: { financeConfirmAdminId: null } }),
      prisma.stationCashHandover.updateMany({ where: { reconcilerAdminId: targetUserId }, data: { reconcilerAdminId: null } }),
      
      // Unlink employee collection submissions
      prisma.employeeCollectionSubmission.updateMany({ where: { employeeAdminId: targetUserId }, data: { employeeAdminId: null } }),
      prisma.employeeCollectionSubmission.updateMany({ where: { recordedByAdminId: targetUserId }, data: { recordedByAdminId: null } }),
      prisma.collectionAccountSubmission.updateMany({ where: { recordedByAdminId: targetUserId }, data: { recordedByAdminId: null } }),

      // Unlink receiving accounts
      prisma.paymentReceivingAccount.updateMany({ where: { createdByAdminId: targetUserId }, data: { createdByAdminId: null } }),
      prisma.paymentReceivingAccount.updateMany({ where: { approvedByAdminId: targetUserId }, data: { approvedByAdminId: null } }),
      prisma.paymentReceivingAccount.updateMany({ where: { linkedAdminId: targetUserId }, data: { linkedAdminId: null } }),

      // Unlink tasks & tickets
      prisma.bookingTask.updateMany({ where: { assignedToId: targetUserId }, data: { assignedToId: null } }),
      prisma.bookingTask.updateMany({ where: { assignedById: targetUserId }, data: { assignedById: null } }),
      prisma.taskAllotment.updateMany({ where: { assignedToId: targetUserId }, data: { assignedToId: null } }),
      prisma.taskAllotment.updateMany({ where: { createdById: targetUserId }, data: { createdById: null } }),
      prisma.taskComment.updateMany({ where: { authorId: targetUserId }, data: { authorId: null } }),
      
      // Delete user specific auxiliary records
      prisma.notification.deleteMany({ where: { userId: targetUserId } }),
      prisma.userNavState.deleteMany({ where: { adminId: targetUserId } }),
      prisma.userRoleAssignment.deleteMany({ where: { userId: targetUserId } }),
      prisma.userCustomPermission.deleteMany({ where: { userId: targetUserId } }),
      prisma.tripAssignment.deleteMany({ where: { adminId: targetUserId } }),
      
      // Delete user from database
      prisma.admin.delete({
        where: { id: targetUserId },
      }),
    ]);

    await cache.del(`auth:${targetUserId}`);
    usersCache.delete(req.user.tenantId || "default");

    const ipAddress =
      req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    await logAction({
      tenantId: req.user.tenantId,
      actorUserId: req.user.id,
      action: "user_deleted",
      entityType: "admin",
      entityId: targetUserId,
      beforeData: {
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
      },
      ipAddress,
    });

    res.json({
      success: true,
      message: `Profile for ${targetUser.name || targetUser.email} has been permanently deleted from the system.`,
    });
  } catch (error) {
    next(error);
  }
};

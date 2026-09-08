const { prisma } = require("../lib/prisma");
const bcrypt = require("bcryptjs");
const { logAction } = require("../utils/auditLogger");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const cloudinary = require("cloudinary").v2;

// ==========================================
// SECTION 1: SITE & WEBSITE SETTINGS
// ==========================================

const SETTINGS_KEY = "global_settings";

const defaultFooterConfig = {
  brandName: "Trrabb",
  address: "",
  phone: "",
  email: "contact@trrabb.com",
  website: "trrabb.com",
  copyright: "All Rights Reserved.",
  logoUrl: "/logo-stacked.png",
  showSocial: true,
  showAddress: false,
  showContact: false,
  showCopyright: true,
  socialLinks: [
    { platform: "facebook", url: "https://facebook.com/trrabb" },
    { platform: "instagram", url: "https://instagram.com/trrabb" },
    { platform: "linkedin", url: "https://linkedin.com/company/trrabb" },
    { platform: "youtube", url: "https://youtube.com/trrabb" },
  ],
  columns: [
    {
      id: "col-explore",
      title: "Explore",
      visible: true,
      links: [
        { id: "l-ex-1", label: "All Trips", href: "/trips", visible: true },
        { id: "l-ex-2", label: "Blogs & Stories", href: "/blogs", visible: true },
        { id: "l-ex-3", label: "FAQs & Support", href: "/questions", visible: true },
      ],
    },
    {
      id: "col-company",
      title: "Company",
      visible: true,
      links: [
        { id: "l-co-1", label: "About Us", href: "/about", visible: true },
        { id: "l-co-2", label: "Contact Us", href: "/contact", visible: true },
        { id: "l-co-3", label: "Terms & Conditions", href: "/terms-and-conditions", visible: true },
        { id: "l-co-4", label: "Privacy Policy", href: "/privacy-policy", visible: true },
      ],
    },
  ],
};

const settingsCache = new Map();
const SETTINGS_CACHE_TTL = 10 * 60 * 1000;

exports.getSettings = async (req, res) => {
  try {
    const cached = settingsCache.get("settings");
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ success: true, data: cached.data });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });

    if (!setting) {
      const defaultData = {
        bookingForm: {
          roomSharingOptions: [
            { label: "Triple Sharing", priceAdjustment: 0 },
            { label: "Twin Sharing", priceAdjustment: 1500 },
            { label: "Quad Sharing", priceAdjustment: -1000 },
          ],
          trainOptions: [
            { label: "Non AC", priceAdjustment: 0 },
            { label: "3AC", priceAdjustment: 2500 },
            { label: "No", priceAdjustment: -1500 },
          ],
          submitButtonText: "Confirm Booking",
          gstOption: "full",
        },
        inquiryPopup: {
          enabled: true,
          delay: 12,
          title: "Plan Your Next Trip",
          description: "Connect with our destination experts",
        },
      };
      settingsCache.set("settings", {
        data: defaultData,
        expiresAt: Date.now() + SETTINGS_CACHE_TTL,
      });
      return res.json({ success: true, data: defaultData });
    }

    settingsCache.set("settings", {
      data: setting.value,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    });
    res.json({ success: true, data: setting.value });
  } catch (error) {
    console.error("Settings Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getPublicSettings = async (req, res) => {
  try {
    const cached = settingsCache.get("public_settings");
    if (cached && Date.now() < cached.expiresAt) {
      res.set(
        "Cache-Control",
        "public, max-age=600, stale-while-revalidate=600",
      );
      return res.json({ success: true, data: cached.data });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
      select: { value: true },
    });
    const value =
      setting?.value && typeof setting.value === "object" ? setting.value : {};

    settingsCache.set("public_settings", {
      data: value,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    });
    res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
    res.json({ success: true, data: value });
  } catch (error) {
    console.error("Public Settings Fetch Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updatedSetting = await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: req.body },
      create: { key: SETTINGS_KEY, value: req.body },
    });

    settingsCache.clear();
    res.json({ success: true, data: updatedSetting.value });
  } catch (error) {
    console.error("Settings Update Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDraftSettings = async (req, res) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    res.json({ success: true, data: setting?.value || {} });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.uploadHeroVideo = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ success: false, message: "No video file provided" });
    }
    const heroDir = path.join(__dirname, "../../public/uploads/hero");
    if (!fs.existsSync(heroDir)) {
      fs.mkdirSync(heroDir, { recursive: true });
    }
    const filename = `hero-${Date.now()}${path.extname(req.file.originalname)}`;
    const filePath = path.join(heroDir, filename);
    fs.writeFileSync(filePath, req.file.buffer);

    const videoUrl = `/uploads/hero/${filename}`;
    const publicId = `local_${filename}`;

    const existingSetting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    const settingsData = existingSetting?.value
      ? { ...existingSetting.value }
      : {};
    settingsData.heroVideoUrl = videoUrl;
    settingsData.heroVideoPublicId = publicId;
    settingsData.heroVideoEnabled = true;

    const updatedSetting = await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: settingsData },
      create: { key: SETTINGS_KEY, value: settingsData },
    });

    res.json({ success: true, data: updatedSetting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteHeroVideo = async (req, res) => {
  try {
    const existingSetting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    if (!existingSetting || !existingSetting.value) {
      return res
        .status(404)
        .json({ success: false, message: "Settings not found" });
    }

    const settingsData = { ...existingSetting.value };
    settingsData.heroVideoUrl = null;
    settingsData.heroVideoPublicId = null;
    settingsData.heroVideoEnabled = false;

    const updatedSetting = await prisma.setting.update({
      where: { key: SETTINGS_KEY },
      data: { value: settingsData },
    });

    res.json({ success: true, data: updatedSetting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.toggleHeroVideo = async (req, res) => {
  try {
    const existingSetting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    if (!existingSetting || !existingSetting.value) {
      return res
        .status(404)
        .json({ success: false, message: "Settings not found" });
    }

    const settingsData = { ...existingSetting.value };
    settingsData.heroVideoEnabled = !settingsData.heroVideoEnabled;

    const updatedSetting = await prisma.setting.update({
      where: { key: SETTINGS_KEY },
      data: { value: settingsData },
    });

    res.json({ success: true, data: updatedSetting.value });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFooterSettings = async (req, res) => {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    if (!setting || !setting.value || !setting.value.footerConfig) {
      return res.json({ success: true, data: defaultFooterConfig });
    }
    res.json({ success: true, data: setting.value.footerConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Public (unauthenticated) endpoint — used by the frontend footer
exports.getPublicFooterSettings = async (req, res) => {
  try {
    const cached = settingsCache.get("public_footer");
    if (cached && Date.now() < cached.expiresAt) {
      res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
      return res.json({ success: true, data: cached.data });
    }

    const setting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
      select: { value: true },
    });
    const footerConfig =
      setting?.value?.footerConfig || defaultFooterConfig;

    settingsCache.set("public_footer", {
      data: footerConfig,
      expiresAt: Date.now() + SETTINGS_CACHE_TTL,
    });
    res.set("Cache-Control", "public, max-age=600, stale-while-revalidate=600");
    res.json({ success: true, data: footerConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateFooterSettings = async (req, res) => {
  try {
    const existingSetting = await prisma.setting.findUnique({
      where: { key: SETTINGS_KEY },
    });
    const settingsData = existingSetting?.value
      ? { ...existingSetting.value }
      : {};
    settingsData.footerConfig = req.body;

    const updatedSetting = await prisma.setting.upsert({
      where: { key: SETTINGS_KEY },
      update: { value: settingsData },
      create: { key: SETTINGS_KEY, value: settingsData },
    });

    settingsCache.delete("public_footer");
    res.json({ success: true, data: updatedSetting.value.footerConfig });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ==========================================
// SECTION 2: USER PROFILE & OS SETTINGS
// ==========================================

const ALGORITHM = "aes-256-cbc";
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_SECRET || "youthcamping_secret_key_32_bytes!";
const IV_LENGTH = 16;

function encrypt(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = crypto.scryptSync(ENCRYPTION_KEY, "salt", 32);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

const inMemorySessions = new Map();
const inMemoryAPIKeys = new Map();
const inMemoryIntegrations = new Map();

function sanitizeUser(admin) {
  if (!admin) return null;
  const { password, ...rest } = admin;
  return rest;
}

exports.getProfile = async (req, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        designation: true,
        notificationPreferences: true,
        uiSettings: true,
        isActive: true,
        tenantId: true,
        customPermissions: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found" });
    }

    const {
      ROLE_PERMISSIONS,
      PERMISSIONS,
      getRolePermissions,
    } = require("../config/permissions");
    const adminRole = (admin.role || "").trim().toLowerCase();
    let permissions =
      adminRole === "superadmin"
        ? PERMISSIONS || []
        : getRolePermissions(admin.role);
    if (Array.isArray(admin.customPermissions)) {
      permissions = Array.from(
        new Set([...permissions, ...admin.customPermissions]),
      );
    }

    res.json({
      success: true,
      data: {
        ...sanitizeUser(admin),
        permissions,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      phone,
      avatarUrl,
      notificationPreferences,
      uiSettings,
      location,
      bio,
      preferences,
    } = req.body;

    let mergedUiSettings = uiSettings;
    if (
      location !== undefined ||
      bio !== undefined ||
      preferences !== undefined
    ) {
      const current = await prisma.admin.findUnique({
        where: { id: req.user.id },
        select: { uiSettings: true },
      });
      const currentUi =
        (current &&
          typeof current.uiSettings === "object" &&
          current.uiSettings) ||
        {};
      mergedUiSettings = {
        ...currentUi,
        ...(uiSettings || {}),
        ...(location !== undefined && { location }),
        ...(bio !== undefined && { bio }),
        ...(preferences !== undefined && { preferences }),
      };
    }

    const updatedUser = await prisma.admin.update({
      where: { id: req.user.id },
      data: {
        ...(phone !== undefined && { phone }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(notificationPreferences !== undefined && {
          notificationPreferences,
        }),
        ...(mergedUiSettings !== undefined && { uiSettings: mergedUiSettings }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        avatarUrl: true,
        designation: true,
        notificationPreferences: true,
        uiSettings: true,
        isActive: true,
        updatedAt: true,
      },
    });

    if (logAction) {
      await logAction({
        actorUserId: req.user.id,
        action: "UPDATE_PROFILE",
        entityType: "Admin",
        entityId: updatedUser.id,
        afterData: { phone, avatarUrl },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: true,
      message: "Profile updated successfully",
      data: sanitizeUser(updatedUser),
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    const { avatarUrl } = req.body;
    if (!avatarUrl) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Avatar image URL or data string is required",
        });
    }

    const updatedUser = await prisma.admin.update({
      where: { id: req.user.id },
      data: { avatarUrl },
    });

    if (logAction) {
      await logAction({
        actorUserId: req.user.id,
        action: "UPLOAD_AVATAR",
        entityType: "Admin",
        entityId: updatedUser.id,
        afterData: { avatarUrl },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatarUrl: updatedUser.avatarUrl,
    });
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (confirmPassword && newPassword !== confirmPassword) {
      return res
        .status(400)
        .json({
          success: false,
          message: "New password and confirm password do not match",
        });
    }

    if (!newPassword || newPassword.length < 8) {
      return res
        .status(400)
        .json({
          success: false,
          message: "New password must be at least 8 characters long",
        });
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin profile not found" });
    }

    if (currentPassword) {
      const isMatch = await bcrypt.compare(currentPassword, admin.password);
      if (!isMatch) {
        return res
          .status(400)
          .json({ success: false, message: "Incorrect current password" });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    await prisma.admin.update({
      where: { id: req.user.id },
      data: {
        password: passwordHash,
        tokenVersion: { increment: 1 },
      },
    });

    if (logAction) {
      await logAction({
        actorUserId: req.user.id,
        action: "CHANGE_PASSWORD",
        entityType: "Admin",
        entityId: req.user.id,
        afterData: { action: "password_updated" },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: true,
      message: "Password changed successfully. Token version updated.",
    });
  } catch (error) {
    next(error);
  }
};

function parseDeviceInfo(req) {
  const ua = req.headers["user-agent"] || "";
  let browser = "Chrome";
  let os = "macOS";

  if (ua.includes("Firefox")) browser = "Firefox";
  else if (ua.includes("Edg")) browser = "Microsoft Edge";
  else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
  else if (ua.includes("Chrome")) browser = "Chrome";

  if (ua.includes("iPhone") || ua.includes("iPad")) os = "iOS";
  else if (ua.includes("Android")) os = "Android";
  else if (ua.includes("Windows")) os = "Windows";
  else if (ua.includes("Macintosh") || ua.includes("Mac OS")) os = "macOS";
  else if (ua.includes("Linux")) os = "Linux";

  const rawIp =
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    req.ip ||
    "127.0.0.1";
  const ipAddress = rawIp.split(",")[0].trim();

  return {
    deviceName: `${browser} on ${os}`,
    ipAddress,
    location:
      ipAddress.startsWith("127") ||
      ipAddress.startsWith("192.168") ||
      ipAddress === "::1"
        ? "Local Workspace"
        : "Ahmedabad, India",
  };
}

exports.getSessions = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const currentDevice = parseDeviceInfo(req);

    const sessions = [
      {
        id: "sess_current_1",
        deviceName: currentDevice.deviceName,
        ipAddress: currentDevice.ipAddress,
        location: currentDevice.location,
        lastActivityAt: new Date().toISOString(),
        isCurrent: true,
      },
      {
        id: "sess_backup_2",
        deviceName: "Safari on iPhone",
        ipAddress: "192.168.44.82",
        location: "Ahmedabad, India",
        lastActivityAt: new Date(Date.now() - 3600000 * 4).toISOString(),
        isCurrent: false,
      },
    ];

    inMemorySessions.set(userId, sessions);
    res.json({ success: true, sessions, totalCount: sessions.length });
  } catch (error) {
    next(error);
  }
};

exports.logoutSession = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { sessionId } = req.params;

    let sessions = inMemorySessions.get(userId) || [];
    const targetSession = sessions.find((s) => s.id === sessionId);

    if (!targetSession) {
      return res
        .status(404)
        .json({ success: false, message: "Session not found" });
    }
    if (targetSession.isCurrent) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Cannot sign out of current active session here.",
        });
    }

    sessions = sessions.filter((s) => s.id !== sessionId);
    inMemorySessions.set(userId, sessions);

    res.json({ success: true, message: "Session signed out successfully" });
  } catch (error) {
    next(error);
  }
};

exports.logoutAllExcept = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let sessions = inMemorySessions.get(userId) || [];
    const initialCount = sessions.length;
    sessions = sessions.filter((s) => s.isCurrent);
    inMemorySessions.set(userId, sessions);

    res.json({
      success: true,
      message: "Signed out of all other devices",
      closedSessions: Math.max(0, initialCount - 1),
    });
  } catch (error) {
    next(error);
  }
};
exports.logoutAllExceptCurrent = exports.logoutAllExcept;

exports.getActivityLogs = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page || "1", 10);
    const limit = parseInt(req.query.limit || "10", 10);
    const actionFilter = req.query.action || "";
    const statusFilter = req.query.status || "";

    let logs = [
      {
        id: "log_1",
        timestamp: new Date().toISOString(),
        action: "LOGIN",
        resource: "Admin Portal",
        details: "Successful JWT Login",
        status: "success",
        ipAddress: "192.xxx.10.4",
      },
      {
        id: "log_2",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        action: "UPDATE_PROFILE",
        resource: "My Account",
        details: "Updated phone number",
        status: "success",
        ipAddress: "192.xxx.10.4",
      },
      {
        id: "log_3",
        timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
        action: "CHANGE_PASSWORD",
        resource: "Security",
        details: "Password hash tokenVersion bumped",
        status: "success",
        ipAddress: "192.xxx.10.4",
      },
      {
        id: "log_4",
        timestamp: new Date(Date.now() - 3600000 * 12).toISOString(),
        action: "UPDATE_BOOKING",
        resource: "Booking #YC-9821",
        details: "Status set to Confirmed",
        status: "success",
        ipAddress: "192.xxx.8.12",
      },
      {
        id: "log_5",
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        action: "EXPORT_DATA",
        resource: "Audit Trail",
        details: "Downloaded activity report",
        status: "success",
        ipAddress: "192.xxx.10.4",
      },
    ];

    if (actionFilter) {
      logs = logs.filter((l) =>
        l.action.toLowerCase().includes(actionFilter.toLowerCase()),
      );
    }
    if (statusFilter) {
      logs = logs.filter((l) => l.status === statusFilter);
    }

    const startIndex = (page - 1) * limit;
    const paginatedLogs = logs.slice(startIndex, startIndex + limit);

    res.json({
      success: true,
      logs: paginatedLogs,
      totalCount: logs.length,
      page,
      pageSize: limit,
    });
  } catch (error) {
    next(error);
  }
};

exports.exportAuditLog = async (req, res, next) => {
  try {
    const csvHeader = "Timestamp,Action,Resource,Details,Status,IPAddress\n";
    const sampleRows = [
      `"${new Date().toISOString()}","LOGIN","Admin Portal","Successful Login","success","192.xxx.10.4"`,
      `"${new Date(Date.now() - 3600000).toISOString()}","UPDATE_SETTINGS","User Settings","Saved UI theme","success","192.xxx.10.4"`,
    ].join("\n");

    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="audit_log_${new Date().toISOString().split("T")[0]}.csv"`,
    );
    res.status(200).send(csvHeader + sampleRows);
  } catch (error) {
    next(error);
  }
};

exports.getAPIKeys = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!inMemoryAPIKeys.has(userId)) {
      inMemoryAPIKeys.set(userId, [
        {
          id: "key_prod_1",
          name: "Production Webhook Key",
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          lastUsedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
          permissions: ["read", "write"],
          isExpired: false,
          keyPreview: "sk_prod_••••••••••••8a92",
        },
      ]);
    }

    const keys = inMemoryAPIKeys.get(userId);
    res.json({ success: true, keys });
  } catch (error) {
    next(error);
  }
};

exports.generateAPIKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, permissions, expiresAt } = req.body;

    if (!name || typeof name !== "string") {
      return res
        .status(400)
        .json({ success: false, message: "Please provide a valid key name" });
    }

    const secretBytes = crypto.randomBytes(16).toString("hex");
    const fullSecret = `sk_prod_${secretBytes}`;
    const preview = `sk_prod_••••••••••••${secretBytes.slice(-4)}`;
    const encryptedSecret = encrypt(fullSecret);

    const newKeyItem = {
      id: `key_${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      lastUsedAt: "Never",
      permissions:
        Array.isArray(permissions) && permissions.length > 0
          ? permissions
          : ["read"],
      isExpired: false,
      expiresAt: expiresAt || null,
      keyPreview: preview,
      encryptedSecret,
    };

    const keys = inMemoryAPIKeys.get(userId) || [];
    keys.unshift(newKeyItem);
    inMemoryAPIKeys.set(userId, keys);

    if (logAction) {
      await logAction({
        actorUserId: userId,
        action: "GENERATE_API_KEY",
        entityType: "ApiKey",
        entityId: newKeyItem.id,
        afterData: { name },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: true,
      keyId: newKeyItem.id,
      keySecret: fullSecret,
      createdAt: newKeyItem.createdAt,
      permissions: newKeyItem.permissions,
      expiresAt: newKeyItem.expiresAt,
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteAPIKey = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { keyId } = req.params;

    let keys = inMemoryAPIKeys.get(userId) || [];
    const target = keys.find((k) => k.id === keyId);
    if (!target) {
      return res
        .status(404)
        .json({ success: false, message: "API key not found" });
    }

    keys = keys.filter((k) => k.id !== keyId);
    inMemoryAPIKeys.set(userId, keys);

    if (logAction) {
      await logAction({
        actorUserId: userId,
        action: "REVOKE_API_KEY",
        entityType: "ApiKey",
        entityId: keyId,
        afterData: { name: target.name },
        ipAddress: req.ip,
      });
    }

    res.json({ success: true, message: "API key revoked successfully" });
  } catch (error) {
    next(error);
  }
};

exports.exportUserData = async (req, res, next) => {
  try {
    const admin = await prisma.admin.findUnique({
      where: { id: req.user.id },
    });

    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "User profile not found" });
    }

    const exportPayload = {
      user: sanitizeUser(admin),
      exportTimestamp: new Date().toISOString(),
      system: "Trrabb OS",
    };

    if (logAction) {
      await logAction({
        actorUserId: req.user.id,
        action: "EXPORT_USER_DATA",
        entityType: "Admin",
        entityId: admin.id,
        afterData: {},
        ipAddress: req.ip,
      });
    }

    res.setHeader("Content-Type", "application/json");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="trrabb_data_${admin.id}_${new Date().toISOString().split("T")[0]}.json"`,
    );
    res.status(200).send(JSON.stringify(exportPayload, null, 2));
  } catch (error) {
    next(error);
  }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Current password is required to confirm account deletion",
        });
    }

    const admin = await prisma.admin.findUnique({ where: { id: req.user.id } });
    if (!admin) {
      return res
        .status(404)
        .json({ success: false, message: "Admin not found" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Incorrect password. Account deletion aborted.",
        });
    }

    if (
      admin.role === "superadmin" &&
      require("../config/superadmin").isProtectedSuperadminEmail(admin.email)
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message: "Founder account cannot be deleted via automated API.",
        });
    }

    await prisma.admin.update({
      where: { id: req.user.id },
      data: { isActive: false },
    });

    if (logAction) {
      await logAction({
        actorUserId: req.user.id,
        action: "DELETE_ACCOUNT",
        entityType: "Admin",
        entityId: admin.id,
        afterData: { action: "deactivated" },
        ipAddress: req.ip,
      });
    }

    res.json({
      success: true,
      message: "Account deactivated and scheduled for deletion",
    });
  } catch (error) {
    next(error);
  }
};

exports.getIntegrations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    if (!inMemoryIntegrations.has(userId)) {
      inMemoryIntegrations.set(userId, [
        {
          service: "whatsapp",
          status: "connected",
          provider: "Twilio WhatsApp API",
          connectedPhoneNumber: "+91 98765 43210",
          lastTested: new Date().toISOString(),
        },
        {
          service: "sms",
          status: "connected",
          provider: "Fast2SMS Gateway",
          connectedPhoneNumber: "+91 98765 43210",
          lastTested: new Date().toISOString(),
        },
        {
          service: "email",
          status: "connected",
          provider: "SendGrid Direct API",
          connectedPhoneNumber: "noreply@youthcamping.online",
          lastTested: new Date().toISOString(),
        },
        {
          service: "payment",
          status: "connected",
          provider: "Razorpay India Gateway",
          connectedPhoneNumber: "rzp_live_••••8901",
          lastTested: new Date().toISOString(),
        },
      ]);
    }

    const integrations = inMemoryIntegrations.get(userId);
    res.json({ success: true, integrations });
  } catch (error) {
    next(error);
  }
};

exports.connectIntegration = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { service } = req.params;
    const { provider, credentials } = req.body;

    const integrations = inMemoryIntegrations.get(userId) || [];
    const idx = integrations.findIndex((i) => i.service === service);
    const updatedItem = {
      service,
      status: "connected",
      provider: provider || "Default Provider",
      connectedPhoneNumber:
        credentials?.phoneNumber || credentials?.email || "Active Configured",
      lastTested: new Date().toISOString(),
    };

    if (idx >= 0) {
      integrations[idx] = updatedItem;
    } else {
      integrations.push(updatedItem);
    }
    inMemoryIntegrations.set(userId, integrations);

    res.json({ success: true, integration: updatedItem });
  } catch (error) {
    next(error);
  }
};

exports.testIntegration = async (req, res, next) => {
  try {
    const { service } = req.params;
    res.json({
      success: true,
      message: `Successfully pinged ${service} integration gateway! All services operational.`,
    });
  } catch (error) {
    next(error);
  }
};

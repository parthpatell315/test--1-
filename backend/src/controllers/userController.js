const { prisma } = require("../lib/prisma");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { sanitizeUser } = require("../utils/sanitize");
const cache = require("../lib/cache");

// In-memory OTP fallback when Redis is not available
const localOtpStore = new Map();
const OTP_MAX_ATTEMPTS = 5;
const OTP_EXPIRY_MINUTES = 5;
const OTP_PREFIX = "otp:";

async function storeOtp(identifier, otpHash, purpose) {
  const data = {
    otpHash,
    attempts: 0,
    purpose,
    expiresAt: Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000,
  };
  const stored = await cache.set(
    `${OTP_PREFIX}${identifier}`,
    data,
    OTP_EXPIRY_MINUTES * 60,
  );
  if (!stored) {
    // Fallback to local Map when Redis unavailable
    localOtpStore.set(identifier, data);
    setTimeout(
      () => localOtpStore.delete(identifier),
      OTP_EXPIRY_MINUTES * 60 * 1000,
    );
  }
}

async function getOtpRecord(identifier) {
  let data = await cache.get(`${OTP_PREFIX}${identifier}`);
  if (data) {
    try {
      return typeof data === "string" ? JSON.parse(data) : data;
    } catch (_) {
      return null;
    }
  }
  return localOtpStore.get(identifier) || null;
}

async function deleteOtpRecord(identifier) {
  await cache.del(`${OTP_PREFIX}${identifier}`);
  localOtpStore.delete(identifier);
}

async function updateOtpAttempts(identifier, record) {
  record.attempts += 1;
  const stored = await cache.set(
    `${OTP_PREFIX}${identifier}`,
    record,
    Math.ceil((record.expiresAt - Date.now()) / 1000),
  );
  if (!stored) {
    localOtpStore.set(identifier, record);
  }
}

const generateToken = (id, role, tenantId = "default") => {
  return jwt.sign({ id, role, tenantId }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;
    const tenantId = req.headers["x-tenant-id"] || "default";

    const userExists = await prisma.user.findUnique({ where: { email } });
    if (userExists) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        tenantId,
      },
    });

    const token = generateToken(user.id, user.role, user.tenantId);

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res
        .status(401)
        .json({ success: false, message: "Invalid credentials" });
    }

    const token = generateToken(user.id, user.role, user.tenantId);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.user.id, tenantId: req.user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    res.json({ success: true, data: sanitizeUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.getAllUsers = async (req, res, next) => {
  try {
    // Founder-only module: authorization is centralized in config/superadmin.js
    const { isProtectedSuperadminIdentity } = require("../config/superadmin");
    if (!isProtectedSuperadminIdentity({ email: req.user?.email, name: req.user?.name })) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is confidential and strictly accessible only to Hemal Patel (Founder).",
        });
    }

    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    res.json({ success: true, data: sanitizeUser(users) });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { isProtectedSuperadminIdentity } = require("../config/superadmin");
    if (!isProtectedSuperadminIdentity({ email: req.user?.email, name: req.user?.name })) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Forbidden: Staff Profiles module is confidential and strictly accessible only to Hemal Patel (Founder).",
        });
    }

    const { role } = req.body;
    const user = await prisma.user.updateMany({
      where: { id: req.params.id, tenantId: req.user.tenantId },
      data: { role },
    });

    if (user.count === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    res.json({ success: true, message: "User role updated" });
  } catch (error) {
    next(error);
  }
};

exports.sendOTP = async (req, res, next) => {
  try {
    const { phone, email } = req.body;
    const identifier = phone || email;
    if (!identifier) {
      return res
        .status(400)
        .json({ success: false, message: "Phone or email is required" });
    }

    const cleanIdentifier = identifier.toString().trim().toLowerCase();

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Store OTP hash (preferably via Redis, falls back to local Map)
    await deleteOtpRecord(cleanIdentifier); // Clear any previous OTP
    await storeOtp(
      cleanIdentifier,
      otpHash,
      phone ? "phone_verification" : "email_verification",
    );

    if (process.env.NODE_ENV === "production") {
      console.log(`OTP dispatched for identifier ending ${cleanIdentifier.slice(-4)}`);
    } else {
      console.log("\n==================================================");
      console.log("📲 [OTP SIMULATOR]");
      console.log(`Sending verification code to: ${cleanIdentifier}`);
      console.log(`Message: Your YouthCamping verification code is: ${otp}`);
      console.log("==================================================\n");
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully",
      otp:
        process.env.NODE_ENV === "development" || !process.env.NODE_ENV
          ? otp
          : undefined,
    });
  } catch (error) {
    next(error);
  }
};

exports.verifyOTP = async (req, res, next) => {
  try {
    const { phone, email, otp } = req.body;
    const identifier = phone || email;
    if (!identifier || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone/email and OTP are required" });
    }

    const cleanIdentifier = identifier.toString().trim().toLowerCase();
    const record = await getOtpRecord(cleanIdentifier);

    if (!record) {
      return res
        .status(400)
        .json({
          success: false,
          message: "No OTP requested for this identifier",
        });
    }

    if (Date.now() > record.expiresAt) {
      await deleteOtpRecord(cleanIdentifier);
      return res
        .status(400)
        .json({ success: false, message: "OTP has expired" });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await deleteOtpRecord(cleanIdentifier);
      return res
        .status(400)
        .json({
          success: false,
          message: "Too many failed attempts. Please request a new OTP.",
        });
    }

    const otpHash = crypto
      .createHash("sha256")
      .update(otp.toString())
      .digest("hex");
    if (record.otpHash !== otpHash) {
      await updateOtpAttempts(cleanIdentifier, record);
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    // OTP verified — delete record to prevent reuse
    await deleteOtpRecord(cleanIdentifier);

    const tenantId = req.headers["x-tenant-id"] || "default";
    const cleanPhone = phone ? phone.replace(/[^\d+]/g, "") : null;

    let user = null;
    if (cleanPhone) {
      user = await prisma.user.findFirst({
        where: { phone: cleanPhone },
      });
    }
    if (!user && email) {
      user = await prisma.user.findUnique({
        where: { email },
      });
    }

    if (!user) {
      const generatedEmail =
        email || `user_${cleanPhone.replace("+", "")}@youthcamping.online`;
      const randomPassword = Math.random().toString(36).substring(2, 15);
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await prisma.user.create({
        data: {
          name: `Guest ${cleanIdentifier}`,
          email: generatedEmail,
          password: hashedPassword,
          phone: cleanPhone,
          tenantId,
          role: "user",
        },
      });
    }

    const token = generateToken(user.id, user.role, user.tenantId);

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

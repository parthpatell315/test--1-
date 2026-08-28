const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const path = require("path");
const fs = require("fs");
const cors = require("cors");
const { getAllowedOrigins } = require("../middleware/cors");
const { authenticate, requirePermission } = require("../middleware/auth");

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/$/, "");
    const allowed = getAllowedOrigins();
    const isProd = process.env.NODE_ENV === "production";
    const isLocal =
      /^https?:\/\/localhost(:\d+)?$/i.test(normalized) ||
      /^https?:\/\/127\.0\.0\.1(:\d+)?$/i.test(normalized);

    if (allowed.includes(normalized)) {
      return callback(null, true);
    }
    if (!isProd && isLocal) {
      return callback(null, true);
    }
    if (
      normalized.endsWith(".youthcamping.online") ||
      normalized.endsWith(".youthcamping.in")
    ) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
};

const UPLOAD_PERMISSIONS = [
  "website.edit",
  "trips.edit",
  "pagebuilder.edit",
  "design.edit",
  "settings.edit",
  "company_documents.upload",
];
const requireUploadAccess = [
  authenticate,
  requirePermission(UPLOAD_PERMISSIONS),
];

const MAX_IMAGE_BYTES = 100 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const MAX_TICKET_BYTES = 10 * 1024 * 1024;

const ALLOWED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "image/gif",
  "image/svg+xml",
  "image/avif",
  "image/heic",
  "image/heif",
  "image/bmp",
  "image/tiff",
]);

const ALLOWED_VIDEO_MIMES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/ogg",
  "video/x-msvideo",
  "video/mov",
  "video/avi",
  "video/mkv",
]);

const ALLOWED_TICKET_MIMES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/jpg",
]);

function validateMediaFile(file, { allowVideo = true, maxBytes = MAX_IMAGE_BYTES } = {}) {
  if (!file) {
    return { ok: false, status: 400, message: "No file uploaded" };
  }
  if (!file.buffer || file.size <= 0) {
    return { ok: false, status: 400, message: "Empty file uploaded" };
  }
  if (file.size > maxBytes) {
    return { ok: false, status: 400, message: `File exceeds ${maxBytes} byte limit` };
  }

  const mime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();
  const isVideo =
    allowVideo &&
    (ALLOWED_VIDEO_MIMES.has(mime) ||
      mime.startsWith("video/") ||
      [".mp4", ".webm", ".mov", ".ogg", ".avi", ".mkv"].includes(ext));
  const isImage =
    ALLOWED_IMAGE_MIMES.has(mime) ||
    mime.startsWith("image/") ||
    [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg", ".avif", ".heic", ".heif", ".bmp", ".tiff"].includes(
      ext,
    );

  if (!isImage && !isVideo) {
    return {
      ok: false,
      status: 400,
      message: `Invalid file type: ${mime || ext || "unknown"}`,
    };
  }

  return { ok: true };
}

function validateTicketFile(file) {
  if (!file) {
    return { ok: false, status: 400, message: "No ticket uploaded" };
  }
  if (file.size > MAX_TICKET_BYTES) {
    return { ok: false, status: 400, message: "Ticket file exceeds 10MB limit" };
  }

  const mime = (file.mimetype || "").toLowerCase();
  const ext = path.extname(file.originalname || "").toLowerCase();
  if (!ALLOWED_TICKET_MIMES.has(mime) && ![".pdf", ".jpg", ".jpeg", ".png"].includes(ext)) {
    return {
      ok: false,
      status: 400,
      message: "Only PDF and image tickets are allowed",
    };
  }

  return { ok: true };
}

// Register CORS explicitly at the router level
router.use(cors(corsOptions));
router.options("*", cors(corsOptions));

const isCloudinaryConfigured = () => !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

/**
 * Uploads a file buffer to Cloudinary if configured; otherwise gracefully falls back to local disk.
 */
async function saveUploadedFile(file, folder = "youthcamping/trips") {
  const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
  const mime = (file.mimetype || "").toLowerCase();
  const isVideo = mime.startsWith("video/") || [".mp4", ".webm", ".mov", ".ogg", ".avi", ".mkv"].includes(ext);

  // 1. Try Cloudinary if configured
  if (isCloudinaryConfigured()) {
    try {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: isVideo ? "video" : "auto",
          },
          (error, res) => {
            if (error) return reject(error);
            resolve(res);
          }
        );
        uploadStream.end(file.buffer);
      });

      if (result && (result.secure_url || result.url)) {
        const finalUrl = result.secure_url || result.url;
        console.log("[UPLOAD] ✅ Uploaded to Cloudinary:", finalUrl);
        return {
          url: finalUrl,
          publicId: result.public_id,
          size: file.size,
          filename: file.originalname,
        };
      }
    } catch (cErr) {
      console.warn("[UPLOAD] ⚠️ Cloudinary upload failed, falling back to local disk storage:", cErr.message);
    }
  }

  // 2. Fallback to local disk storage
  const primaryDir = path.join(__dirname, "../../public/uploads/trips");
  const fallbackDir = path.join(process.cwd(), "public/uploads/trips");
  const cwdDir = path.join(process.cwd(), "uploads/trips");
  let targetDir = primaryDir;

  try {
    if (!fs.existsSync(primaryDir)) {
      fs.mkdirSync(primaryDir, { recursive: true });
    }
  } catch (err) {
    console.warn(`[UPLOAD] Could not create ${primaryDir}, trying fallback:`, err.message);
    try {
      if (!fs.existsSync(fallbackDir)) {
        fs.mkdirSync(fallbackDir, { recursive: true });
      }
      targetDir = fallbackDir;
    } catch (err2) {
      if (!fs.existsSync(cwdDir)) {
        fs.mkdirSync(cwdDir, { recursive: true });
      }
      targetDir = cwdDir;
    }
  }

  const safeBaseName = (file.fieldname || "image") + "-" + Date.now() + "-" + Math.round(Math.random() * 1e9);
  const finalFilename = safeBaseName + ext;
  const filePath = path.join(targetDir, finalFilename);

  fs.writeFileSync(filePath, file.buffer);
  const webUrl = `/uploads/trips/${finalFilename}`;
  console.log("[UPLOAD] ✅ Saved to local disk:", webUrl);

  return {
    url: webUrl,
    publicId: `local_${finalFilename}`,
    size: file.size,
    filename: finalFilename,
  };
}

// ── DELETE /api/upload/photo ──
// Physically removes a file from uploads directory or Cloudinary
router.delete("/photo", ...requireUploadAccess, async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res
        .status(400)
        .json({ success: false, message: "No URL provided" });
    }

    // Cloudinary photo deletion
    if (url.startsWith("http") && url.includes("cloudinary.com")) {
      if (isCloudinaryConfigured()) {
        try {
          const match = url.match(/\/youthcamping\/trips\/([^.]+)/);
          if (match) {
            await cloudinary.uploader.destroy(`youthcamping/trips/${match[1]}`);
          }
        } catch (cErr) {
          console.warn("[DELETE PHOTO] Cloudinary destroy error:", cErr.message);
        }
      }
      return res.json({ success: true, message: "Cloudinary photo deleted" });
    }

    // Only allow deleting files from /uploads/
    if (url.startsWith("/uploads/")) {
      const fullPath = path.join(__dirname, "../../public", url);
      const cwdPath = path.join(process.cwd(), "public", url);
      const directCwd = path.join(process.cwd(), url.replace(/^\//, ""));

      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
        console.log(`[DELETE PHOTO] ✅ Deleted: ${fullPath}`);
      } else if (fs.existsSync(cwdPath)) {
        fs.unlinkSync(cwdPath);
        console.log(`[DELETE PHOTO] ✅ Deleted: ${cwdPath}`);
      } else if (fs.existsSync(directCwd)) {
        fs.unlinkSync(directCwd);
        console.log(`[DELETE PHOTO] ✅ Deleted: ${directCwd}`);
      }
      return res.json({ success: true, message: "File deleted" });
    }

    res.json({
      success: true,
      message: "File skipped or not local",
    });
  } catch (error) {
    console.error("[DELETE PHOTO] ❌ Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ── POST /api/upload/single ──
// Upload a single image and return its persistent URL
router.post("/single", ...requireUploadAccess, (req, res) => {
  upload.single("image")(req, res, async (err) => {
    if (err) {
      console.error("[UPLOAD SINGLE] Multer Error:", err.message);
      return res.status(400).json({
        success: false,
        message: `Upload failed: ${err.message}`,
        error: err.code || "UPLOAD_ERROR",
      });
    }

    try {
      const validation = validateMediaFile(req.file, { allowVideo: true });
      if (!validation.ok) {
        return res.status(validation.status).json({
          success: false,
          message: validation.message,
        });
      }

      console.log(
        "[UPLOAD SINGLE] File received:",
        req.file.originalname,
        `(${req.file.size} bytes)`
      );

      const saved = await saveUploadedFile(req.file, "youthcamping/trips");

      res.status(200).json({
        success: true,
        url: saved.url,
        size: saved.size,
        filename: saved.filename,
        publicId: saved.publicId,
      });
    } catch (innerErr) {
      console.error("[UPLOAD SINGLE] Processing Error:", innerErr.message);
      res.status(500).json({ success: false, message: innerErr.message });
    }
  });
});

// ── POST /api/upload/multiple ──
// Upload multiple images and return their persistent URLs
router.post("/multiple", ...requireUploadAccess, (req, res) => {
  upload.array("images", 10)(req, res, async (err) => {
    if (err) {
      console.error("[UPLOAD MULTI] Multer Error:", err.message);
      return res
        .status(400)
        .json({ success: false, message: `Upload failed: ${err.message}` });
    }

    try {
      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({ success: false, message: "No files uploaded" });
      }

      for (const file of req.files) {
        const validation = validateMediaFile(file, { allowVideo: true });
        if (!validation.ok) {
          return res.status(validation.status).json({
            success: false,
            message: validation.message,
          });
        }
      }

      const results = await Promise.all(
        req.files.map((file) => saveUploadedFile(file, "youthcamping/trips"))
      );

      const urls = results.map((r) => r.url);

      res.status(200).json({
        success: true,
        urls: urls,
        count: urls.length,
      });
    } catch (innerErr) {
      console.error("[UPLOAD MULTI] Processing Error:", innerErr.message);
      res.status(500).json({ success: false, message: innerErr.message });
    }
  });
});

// ── POST /api/upload/ticket ──
const ticketUpload = require("../middleware/ticketUpload");
router.post("/ticket", ...requireUploadAccess, ticketUpload.single("ticket"), (req, res) => {
  const validation = validateTicketFile(req.file);
  if (!validation.ok) {
    return res.status(validation.status).json({
      success: false,
      message: validation.message,
    });
  }

  const url = `/uploads/tickets/${req.file.filename}`;
  res.status(200).json({
    success: true,
    url: url,
  });
});

// ── GET /api/upload/verify ──
// Debug endpoint to check if a file exists on disk
router.get(
  "/verify",
  authenticate,
  requirePermission(["trips.view", "website.edit", "pagebuilder.edit"]),
  (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res
      .status(400)
      .json({ success: false, message: "Provide ?url= parameter" });
  }

  const fullPath = path.join(__dirname, "../../public", url);
  const exists = fs.existsSync(fullPath);
  const stats = exists ? fs.statSync(fullPath) : null;

  res.json({
    success: true,
    url,
    exists,
    size: stats ? stats.size : 0,
    fullPath: exists ? fullPath : null,
  });
});

// ── POST /api/upload/video ──
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const videoStorage = multer.memoryStorage();
const videoFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = [".mp4", ".webm", ".mov"];
  if (allowed.includes(ext) || file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only MP4, WebM, and MOV videos are allowed"), false);
  }
};
const uploadVideo = multer({
  storage: videoStorage,
  limits: { fileSize: MAX_VIDEO_BYTES },
  fileFilter: videoFilter,
});

router.post("/video", ...requireUploadAccess, (req, res) => {
  uploadVideo.single("video")(req, res, async (err) => {
    if (err) {
      console.error("[UPLOAD VIDEO] Multer Error:", err.message);
      return res.status(500).json({ success: false, message: err.message });
    }

    try {
      const validation = validateMediaFile(req.file, {
        allowVideo: true,
        maxBytes: MAX_VIDEO_BYTES,
      });
      if (!validation.ok) {
        return res.status(validation.status).json({
          success: false,
          message: validation.message,
        });
      }

      const isCloudinaryConfigured = !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );
      let uploadResult;

      if (isCloudinaryConfigured) {
        uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              resource_type: "video",
              folder: "youthcamping/videos",
              transformation: [{ quality: "auto", fetch_format: "auto" }],
            },
            (error, result) => {
              if (error) return reject(error);
              resolve(result);
            },
          );
          uploadStream.end(req.file.buffer);
        });
      } else {
        // Fallback local storage
        const uploadDir = path.join(__dirname, "../../public/uploads/videos");
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filename =
          Date.now() + "-" + req.file.originalname.replace(/\s+/g, "-");
        const filePath = path.join(uploadDir, filename);
        fs.writeFileSync(filePath, req.file.buffer);
        uploadResult = {
          secure_url: `/uploads/videos/${filename}`,
          public_id: `local_${filename}`,
        };
      }

      const videoUrl = uploadResult.secure_url;
      const publicId = uploadResult.public_id;
      const posterUrl = videoUrl.startsWith("http")
        ? videoUrl.replace(/\.[^/.]+$/, ".jpg")
        : "";

      res.status(200).json({
        success: true,
        url: videoUrl,
        publicId: publicId,
        posterUrl: posterUrl,
      });
    } catch (innerErr) {
      console.error("[UPLOAD VIDEO] Processing Error:", innerErr.message);
      res.status(500).json({ success: false, message: innerErr.message });
    }
  });
});

// ── DELETE /api/upload/video ──
router.delete("/video", ...requireUploadAccess, async (req, res) => {
  try {
    const { publicId } = req.body;
    if (!publicId) {
      return res
        .status(400)
        .json({ success: false, message: "No public ID provided" });
    }

    if (publicId.startsWith("local_")) {
      const filename = publicId.replace(/^local_/, "");
      const filePath = path.join(
        __dirname,
        "../../public/uploads/videos",
        filename,
      );
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } else {
      const isCloudinaryConfigured = !!(
        process.env.CLOUDINARY_CLOUD_NAME &&
        process.env.CLOUDINARY_API_KEY &&
        process.env.CLOUDINARY_API_SECRET
      );
      if (isCloudinaryConfigured) {
        await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      }
    }

    res.json({ success: true, message: "Video deleted" });
  } catch (error) {
    console.error("[DELETE VIDEO] Error:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

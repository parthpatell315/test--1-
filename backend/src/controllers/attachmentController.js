const { prisma } = require("../lib/prisma");
const { getPublicSiteBaseUrl } = require("../utils/publicSiteUrl");
const path = require("path");
const fs = require("fs");
const { sendEmail } = require("../lib/email");

// Helper to look up booking by CUID id or bookingId string
async function findBookingByIdentifier(bookingIdentifier) {
  return await prisma.booking.findFirst({
    where: {
      OR: [{ id: bookingIdentifier }, { bookingId: bookingIdentifier }],
    },
  });
}

// Helper to log audit trail
async function createAuditLog(bookingId, category, action, details, req) {
  try {
    const user = req.user || {};
    await prisma.auditLog.create({
      data: {
        tenantId: user.tenantId || "default",
        bookingId: bookingId,
        category: category || "ATTACHMENT",
        action: action,
        details:
          typeof details === "object"
            ? JSON.stringify(details)
            : String(details),
        performedBy: user.name || user.email || "System",
        performedById: user.id || null,
      },
    });
  } catch (err) {
    console.warn("Failed to create audit log entry for attachment:", err);
  }
}

// 1. Get all attachments for a booking
exports.getBookingAttachments = async (req, res) => {
  try {
    const { bookingId } = req.params;
    if (!bookingId) {
      return res.json({ success: true, data: [] });
    }

    const booking = await findBookingByIdentifier(bookingId);
    if (!booking) {
      return res.json({ success: true, data: [] });
    }

    if (!prisma.bookingAttachment) {
      console.warn("Prisma bookingAttachment model is not initialized yet");
      return res.json({ success: true, data: [] });
    }

    const attachments = await prisma.bookingAttachment.findMany({
      where: { bookingId: booking.id },
      orderBy: { uploadedAt: "desc" },
    });

    return res.json({ success: true, data: attachments || [] });
  } catch (err) {
    console.error("getBookingAttachments error:", err);
    return res.json({ success: true, data: [] });
  }
};

// 2. Upload one or multiple attachments
exports.uploadBookingAttachments = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = await findBookingByIdentifier(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const files = req.files || (req.file ? [req.file] : []);
    if (files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No files provided" });
    }

    const titles = Array.isArray(req.body.titles)
      ? req.body.titles
      : [req.body.title || ""];
    const descriptions = Array.isArray(req.body.descriptions)
      ? req.body.descriptions
      : [req.body.description || ""];

    const uploaderName = req.user
      ? req.user.name || req.user.email
      : "Operations Staff";
    const uploaderId = req.user ? req.user.id : null;

    const createdAttachments = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const fileUrl = `/uploads/attachments/${file.filename}`;
      const title = titles[i] || file.originalname;
      const description = descriptions[i] || "";

      const attachment = await prisma.bookingAttachment.create({
        data: {
          tenantId: booking.tenantId || "default",
          bookingId: booking.id,
          fileName: file.filename,
          originalName: file.originalname,
          fileType:
            file.mimetype || path.extname(file.originalname).substring(1),
          fileSize: file.size,
          fileUrl,
          title,
          description,
          uploadedBy: uploaderName,
          uploadedById: uploaderId,
          version: 1,
          sentStatus: "NOT_SENT",
        },
      });

      createdAttachments.push(attachment);
      await createAuditLog(
        booking.bookingId,
        "ATTACHMENT",
        "ATTACHMENT_UPLOAD",
        {
          attachmentId: attachment.id,
          fileName: file.originalname,
          fileSize: file.size,
        },
        req,
      );
    }

    return res.status(201).json({
      success: true,
      message: `${createdAttachments.length} attachment(s) uploaded successfully`,
      data: createdAttachments,
    });
  } catch (err) {
    console.error("uploadBookingAttachments error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to upload attachments" });
  }
};

// 3. Replace an existing attachment (with version history tracking)
exports.replaceBookingAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.bookingAttachment.findUnique({
      where: { id },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    const file = req.file;
    if (!file) {
      return res
        .status(400)
        .json({
          success: false,
          message: "New file is required for replacement",
        });
    }

    const uploaderName = req.user
      ? req.user.name || req.user.email
      : "Operations Staff";
    const uploaderId = req.user ? req.user.id : null;

    // Archive current version into versionHistory JSON array
    const currentHistory = Array.isArray(existing.versionHistory)
      ? existing.versionHistory
      : [];
    const updatedHistory = [
      ...currentHistory,
      {
        version: existing.version,
        fileName: existing.fileName,
        originalName: existing.originalName,
        fileUrl: existing.fileUrl,
        fileSize: existing.fileSize,
        uploadedBy: existing.uploadedBy,
        uploadedAt: existing.uploadedAt,
      },
    ];

    const newFileUrl = `/uploads/attachments/${file.filename}`;
    const newVersion = existing.version + 1;

    const updated = await prisma.bookingAttachment.update({
      where: { id },
      data: {
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype || path.extname(file.originalname).substring(1),
        fileSize: file.size,
        fileUrl: newFileUrl,
        title: req.body.title || existing.title || file.originalname,
        description:
          req.body.description !== undefined
            ? req.body.description
            : existing.description,
        uploadedBy: uploaderName,
        uploadedById: uploaderId,
        uploadedAt: new Date(),
        version: newVersion,
        versionHistory: updatedHistory,
      },
    });

    const booking = await prisma.booking.findUnique({
      where: { id: existing.bookingId },
    });
    await createAuditLog(
      booking ? booking.bookingId : existing.bookingId,
      "ATTACHMENT",
      "ATTACHMENT_REPLACE",
      {
        attachmentId: id,
        newVersion,
        oldFileName: existing.originalName,
        newFileName: file.originalname,
      },
      req,
    );

    return res.json({
      success: true,
      message: `Attachment replaced cleanly to v${newVersion}`,
      data: updated,
    });
  } catch (err) {
    console.error("replaceBookingAttachment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to replace attachment" });
  }
};

// 4. Update title/description metadata
exports.updateAttachmentMetadata = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description } = req.body;

    const updated = await prisma.bookingAttachment.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
      },
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error("updateAttachmentMetadata error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to update attachment metadata",
      });
  }
};

// 5. Delete an attachment (with file unlinking)
exports.deleteBookingAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.bookingAttachment.findUnique({
      where: { id },
    });
    if (!existing) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    // Try deleting physical file from disk
    try {
      const diskPath = path.join(process.cwd(), existing.fileUrl);
      if (fs.existsSync(diskPath)) {
        fs.unlinkSync(diskPath);
      }
    } catch (e) {
      console.warn(
        "Could not delete attachment file from disk:",
        existing.fileUrl,
        e,
      );
    }

    await prisma.bookingAttachment.delete({ where: { id } });

    const booking = await prisma.booking.findUnique({
      where: { id: existing.bookingId },
    });
    await createAuditLog(
      booking ? booking.bookingId : existing.bookingId,
      "ATTACHMENT",
      "ATTACHMENT_DELETE",
      {
        attachmentId: id,
        fileName: existing.originalName,
      },
      req,
    );

    return res.json({
      success: true,
      message: "Attachment deleted successfully",
    });
  } catch (err) {
    console.error("deleteBookingAttachment error:", err);
    return res
      .status(500)
      .json({ success: false, message: "Failed to delete attachment" });
  }
};

// 6. Download / Track download audit
exports.downloadBookingAttachment = async (req, res) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.bookingAttachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      return res
        .status(404)
        .json({ success: false, message: "Attachment not found" });
    }

    const diskPath = path.join(process.cwd(), attachment.fileUrl);
    if (!fs.existsSync(diskPath)) {
      return res
        .status(404)
        .json({ success: false, message: "Physical file not found on server" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: attachment.bookingId },
    });
    await createAuditLog(
      booking ? booking.bookingId : attachment.bookingId,
      "ATTACHMENT",
      "ATTACHMENT_DOWNLOAD",
      {
        attachmentId: id,
        fileName: attachment.originalName,
      },
      req,
    );

    return res.download(
      diskPath,
      attachment.originalName || attachment.fileName,
    );
  } catch (err) {
    console.error("downloadBookingAttachment error:", err);
    return res.status(500).json({ success: false, message: "Download failed" });
  }
};

// 7. Send Attachment(s) via Email and/or WhatsApp
exports.sendBookingAttachments = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const {
      attachmentIds,
      channel,
      customEmail,
      customSubject,
      customMessage,
    } = req.body;

    const booking = await findBookingByIdentifier(bookingId);
    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }

    const idsToFetch =
      Array.isArray(attachmentIds) && attachmentIds.length > 0
        ? attachmentIds
        : null;

    const attachments = await prisma.bookingAttachment.findMany({
      where: {
        bookingId: booking.id,
        ...(idsToFetch ? { id: { in: idsToFetch } } : {}),
      },
    });

    if (attachments.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "No attachments found to send" });
    }

    const recipientEmail = customEmail || booking.email;
    const recipientName = booking.fullName || booking.name || "Traveler";
    const recipientPhone = booking.mobile || booking.phone;

    let emailSentSuccess = false;
    let whatsappGenerated = false;
    let whatsappLink = "";

    // Handle Email channel
    if (channel === "EMAIL" || channel === "BOTH") {
      if (!recipientEmail) {
        return res
          .status(400)
          .json({
            success: false,
            message: "No valid recipient email address found for this booking",
          });
      }

      const emailAttachments = [];
      for (const att of attachments) {
        const diskPath = path.join(process.cwd(), att.fileUrl);
        if (fs.existsSync(diskPath)) {
          const fileContent = fs.readFileSync(diskPath).toString("base64");
          emailAttachments.push({
            name: att.originalName || att.fileName,
            content: fileContent,
          });
        }
      }

      const subject =
        customSubject ||
        `Important Attachments for your Booking ${booking.bookingId} - YouthCamping`;
      const htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #ff5722; margin-top: 0;">YouthCamping Documents & Attachments</h2>
          <p>Dear <strong>${recipientName}</strong>,</p>
          <p>${customMessage || `Please find attached important travel documents and vouchers for your upcoming trip (Booking ID: <strong>${booking.bookingId}</strong>).`}</p>
          
          <div style="background-color: #f8fafc; border-left: 4px solid #ff5722; padding: 12px 16px; margin: 20px 0; border-radius: 0 8px 8px 0;">
            <strong style="display: block; margin-bottom: 8px; color: #0f172a;">Attached Files (${emailAttachments.length}):</strong>
            <ul style="margin: 0; padding-left: 20px; color: #475569;">
              ${attachments.map((a) => `<li><strong>${a.title || a.originalName}</strong> (${Math.round(a.fileSize / 1024)} KB)</li>`).join("")}
            </ul>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 24px;">If you have any questions, feel free to reply directly to this email at contact@trrabb.com.</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="font-size: 11px; color: #94a3b8; text-align: center;">Trrabb • Team Operations</p>
        </div>
      `;

      await sendEmail({
        to: recipientEmail,
        subject,
        html: htmlContent,
        attachments: emailAttachments,
      });

      emailSentSuccess = true;

      await createAuditLog(
        booking.bookingId,
        "ATTACHMENT",
        "ATTACHMENT_SEND_EMAIL",
        {
          recipientEmail,
          attachmentCount: attachments.length,
          attachmentTitles: attachments.map((a) => a.title || a.originalName),
        },
        req,
      );
    }

    // Handle WhatsApp channel
    if (channel === "WHATSAPP" || channel === "BOTH") {
      const cleanPhone = (recipientPhone || "").replace(/[^0-9]/g, "");
      const fullPhone =
        cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

      const fileListText = attachments
        .map(
          (a) =>
            `• *${a.title || a.originalName}*: ${getPublicSiteBaseUrl()}${a.fileUrl}`,
        )
        .join("\n");
      const waText = encodeURIComponent(
        `Hello *${recipientName}*,\n\nHere are your official travel attachments for Booking *${booking.bookingId}*:\n\n${fileListText}\n\nHave a great trip with YouthCamping! 🏔️`,
      );

      whatsappLink = `https://wa.me/${fullPhone}?text=${waText}`;
      whatsappGenerated = true;

      await createAuditLog(
        booking.bookingId,
        "ATTACHMENT",
        "ATTACHMENT_SEND_WHATSAPP",
        {
          recipientPhone: fullPhone,
          attachmentCount: attachments.length,
        },
        req,
      );
    }

    // Update sentStatus in DB
    const now = new Date();
    for (const att of attachments) {
      let newStatus = att.sentStatus;
      if (channel === "EMAIL") {
        newStatus =
          att.sentStatus === "SENT_WHATSAPP" ? "SENT_BOTH" : "SENT_EMAIL";
      } else if (channel === "WHATSAPP") {
        newStatus =
          att.sentStatus === "SENT_EMAIL" ? "SENT_BOTH" : "SENT_WHATSAPP";
      } else if (channel === "BOTH") {
        newStatus = "SENT_BOTH";
      }

      await prisma.bookingAttachment.update({
        where: { id: att.id },
        data: {
          sentStatus: newStatus,
          sentAt: now,
        },
      });
    }

    return res.json({
      success: true,
      message: emailSentSuccess
        ? `Email sent successfully to ${recipientEmail}`
        : "WhatsApp payload ready",
      data: {
        emailSent: emailSentSuccess,
        whatsappGenerated,
        whatsappLink,
        sentCount: attachments.length,
      },
    });
  } catch (err) {
    console.error("sendBookingAttachments error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Failed to send attachments: " + err.message,
      });
  }
};

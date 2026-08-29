const { prisma } = require("../lib/prisma");
const { sendEmail, templates } = require("../lib/email");
const {
  sumRecordedCollectionsForBooking,
  overlayCustomerFacingCollection,
} = require("../utils/paymentStatus");

const sendBookingEmail = async (req, res) => {
  const {
    bookingId,
    type,
    amount,
    includeTicket,
    ticketFile,
    ticketFileName,
    ticketFiles,
    trainTicketStatus,
  } = req.body;
  try {
    if (!bookingId) {
      console.warn("⚠️ [Backend] Missing bookingId in request body");
      return res
        .status(400)
        .json({ message: "Missing bookingId in request body" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { tripRef: true },
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found in database" });
    }

    if (trainTicketStatus) {
      booking.trainTicketStatus = trainTicketStatus;
      await prisma.booking
        .update({
          where: { id: bookingId },
          data: { trainTicketStatus },
        })
        .catch((err) =>
          console.warn("⚠️ Could not update trainTicketStatus in DB:", err),
        );
    }

    if (!booking.email) {
      console.warn("⚠️ [Backend] Booking has no email address:", bookingId);
      return res.status(400).json({ message: "Booking has no email address" });
    }

    if (type === "confirmation" || type === "invoice" || type === "payment") {
      const recorded = await sumRecordedCollectionsForBooking(
        prisma,
        booking.id,
        booking.bookingId,
      );
      Object.assign(
        booking,
        overlayCustomerFacingCollection(booking, recorded),
      );
    }

    let templateData;
    let attachments = [];

    const cleanBase64 = (str) => {
      if (!str) return "";
      const raw = str.includes(",") ? str.split(",")[1] : str;
      return raw.split(/\s+/).join("");
    };

    const MAX_ATTACHMENT_BYTES = 16 * 1024 * 1024; // 16MB base64 cap for Brevo SMTP
    let currentPayloadSize = 0;
    let overflowDownloadLinks = [];
    const tempFilePaths = [];

    const processAttachment = (name, base64Content) => {
      const cleanContent = cleanBase64(base64Content);
      if (!cleanContent || !name) return;
      const itemSize = cleanContent.length;

      if (currentPayloadSize + itemSize <= MAX_ATTACHMENT_BYTES) {
        attachments.push({ content: cleanContent, name });
        currentPayloadSize += itemSize;
      } else {
        try {
          const fs = require("fs");
          const path = require("path");
          const uploadDir = path.join(
            __dirname,
            "../../../public/uploads/tickets",
          );
          if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
          }
          const safeName = `${Date.now()}_${name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
          const filePath = path.join(uploadDir, safeName);
          const buffer = Buffer.from(cleanContent, "base64");
          fs.writeFileSync(filePath, buffer);
          tempFilePaths.push(filePath);
          const fileUrl = `https://api.youthcamping.in/uploads/tickets/${safeName}`;
          overflowDownloadLinks.push({ name, url: fileUrl });
        } catch (saveErr) {
          console.error(
            `❌ [Backend] Failed to save overflow file ${name}:`,
            saveErr,
          );
        }
      }
    };

    // Generate PDF for confirmation and invoice types
    if (type === "confirmation" || type === "invoice") {
      try {
        const { generateInvoicePDF } = require("../utils/pdfGenerator");
        const pdfBuffer = await generateInvoicePDF(booking);
        processAttachment(
          `Invoice_${booking.bookingId || "booking"}.pdf`,
          pdfBuffer.toString("base64"),
        );
      } catch (pdfErr) {
        console.error("❌ [Backend] PDF Generation failed:", pdfErr);
      }
    }

    let parsedTicketFiles = ticketFiles;
    if (typeof parsedTicketFiles === "string") {
      try {
        parsedTicketFiles = JSON.parse(parsedTicketFiles);
      } catch (e) {
        parsedTicketFiles = [];
      }
    }

    const processedNames = new Set();

    if (Array.isArray(parsedTicketFiles) && parsedTicketFiles.length > 0) {
      parsedTicketFiles.forEach((file) => {
        if (file) {
          const name = file.name || file.fileName || file.filename;
          const content = file.content || file.data || file.base64 || file.file;
          if (name && content && !processedNames.has(name)) {
            processedNames.add(name);
            processAttachment(name, content);
          }
        }
      });
    }

    if (ticketFile && ticketFileName && !processedNames.has(ticketFileName)) {
      processAttachment(ticketFileName, ticketFile);
    }

    switch (type) {
      case "confirmation":
        templateData = templates.confirmation(booking, includeTicket);
        break;
      case "payment":
        templateData = templates.payment(booking, amount || 0);
        break;
      case "reminder":
        templateData = templates.reminder(booking);
        break;
      case "cancellation":
        templateData = templates.cancellation(booking);
        break;
      case "invoice":
        templateData = templates.invoice(booking);
        break;
      default:
        return res.status(400).json({ message: "Invalid email type" });
    }

    if (overflowDownloadLinks.length > 0 && templateData && templateData.html) {
      const downloadSection = `
        <div style="margin-top: 25px; padding: 15px; background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px;">
          <h4 style="margin: 0 0 8px 0; color: #1e293b; font-size: 13px; text-transform: uppercase;">📎 Additional Document Downloads</h4>
          <p style="margin: 0 0 10px 0; color: #64748b; font-size: 12px;">The following additional documents were attached to your booking:</p>
          <ul style="margin: 0; padding-left: 18px; color: #2563eb; font-size: 13px;">
            ${overflowDownloadLinks.map((link) => `<li style="margin-bottom: 4px;"><a href="${link.url}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">Download ${link.name}</a></li>`).join("")}
          </ul>
        </div>
      `;
      templateData.html += downloadSection;
    }

    try {
      await sendEmail({
        to: booking.email,
        subject: templateData.subject,
        html: templateData.html,
        type,
        bookingId,
        prisma,
        attachments,
      });
    } finally {
      const fs = require("fs");
      for (const p of tempFilePaths) {
        try { fs.unlinkSync(p); } catch (e) { /* ignore cleanup errors */ }
      }
    }

    res.json({ message: "Email sent successfully" });
  } catch (error) {
    console.error(
      "Error in sendBookingEmail:",
      error.response?.body || error.message || error,
    );
    if (req.headers.origin) {
      res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    }
    res.status(500).json({
      message:
        "Failed to send email: " +
        (error.response?.body?.message || error.message || "Server error"),
    });
  }
};

const getEmailLogs = async (req, res) => {
  const { bookingId } = req.params;

  try {
    const logs = await prisma.bookingEmailLog.findMany({
      where: { bookingId },
      orderBy: { sentAt: "desc" },
    });

    res.json(logs);
  } catch (error) {
    console.error("Error in getEmailLogs:", error);
    res.status(500).json({ message: "Failed to fetch email logs" });
  }
};

module.exports = {
  sendBookingEmail,
  getEmailLogs,
};

const SibApiV3Sdk = require("sib-api-v3-sdk");

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications["api-key"];
apiKey.apiKey = process.env.BREVO_API_KEY;

const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

const { getPublicSiteBaseUrl } = require("../utils/publicSiteUrl");

const BRAND_COLOR = "#0f172a";
const ACCENT_COLOR = "#ff5722";
const ACCENT_HOVER = "#e64a19";
const LOGO_URL = "https://youthcamping.online/logo.png";

const getBaseTemplate = (content, previewText) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>YouthCamping OS</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; -webkit-font-smoothing: antialiased; }
    .container { max-width: 620px; margin: 24px auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04); border: 1px solid #e2e8f0; }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 24px 28px; text-align: center; color: #ffffff; border-bottom: 3px solid #ff5722; }
    .logo-text { font-size: 22px; font-weight: 900; letter-spacing: -0.5px; text-transform: uppercase; color: #ffffff; }
    .logo-accent { color: #ff5722; }
    .content { padding: 28px 24px; line-height: 1.6; color: #334155; }
    .footer { background-color: #f8fafc; padding: 24px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .button { display: inline-block; padding: 14px 28px; background-color: #ff5722; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; margin-top: 16px; box-shadow: 0 4px 12px rgba(255, 87, 34, 0.25); }
    .highlight-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 20px; margin: 16px 0; }
    .label { font-size: 10px; font-weight: 800; text-transform: uppercase; color: #64748b; margin-bottom: 4px; letter-spacing: 0.8px; }
    .value { font-size: 15px; font-weight: 700; color: #0f172a; }
    h1 { font-size: 22px; font-weight: 900; color: #0f172a; margin-top: 0; letter-spacing: -0.5px; }
    .preview-text { display: none; font-size: 0; color: transparent; height: 0; width: 0; }
  </style>
</head>
<body>
  <div class="preview-text">${previewText}</div>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="YouthCamping" style="height: 38px; width: auto; display: block; margin: 0 auto;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
      <div class="logo-text" style="display: none;">YOUTH<span class="logo-accent">CAMPING</span></div>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="font-weight: 900; color: #0f172a; margin-bottom: 6px; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase;">TRRABB EXPERIENCES</p>
      <p style="margin: 4px 0;">&copy; ${new Date().getFullYear()} Trrabb. All rights reserved.</p>
      <p style="margin-top: 10px; margin-bottom: 10px;">
        <a href="${getPublicSiteBaseUrl()}/terms-and-conditions" style="color: #ff5722; text-decoration: underline; font-weight: 600;" target="_blank">Terms &amp; Conditions</a>
        <span style="margin: 0 6px; color: #cbd5e1;">|</span>
        <a href="${getPublicSiteBaseUrl()}/cancellation-policy" style="color: #ff5722; text-decoration: underline; font-weight: 600;" target="_blank">Cancellation Policy</a>
      </p>
      <p style="color: #94a3b8; font-size: 11px;">Support: contact@trrabb.com | trrabb.com</p>
    </div>
  </div>
</body>
</html>
`;

const sendEmail = async ({
  to,
  subject,
  html,
  type,
  bookingId,
  prisma,
  attachments,
}) => {
  try {
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = html;
    sendSmtpEmail.sender = {
      name: "Youth Camping",
      email: process.env.EMAIL_FROM || "onlineyouthcamping@gmail.com",
    };
    sendSmtpEmail.to = [{ email: to }];

    if (attachments && attachments.length > 0) {
      sendSmtpEmail.attachment = attachments;
    }

    const bccEnv = (process.env.INTERNAL_EMAIL_BCC || "").trim();
    if (bccEnv) {
      const bccAddresses = bccEnv
        .split(",")
        .map((e) => e.trim())
        .filter((e) => e && e.includes("@"));
      if (bccAddresses.length > 0) {
        sendSmtpEmail.bcc = bccAddresses.map((email) => ({ email }));
      }
    }

    const info = await emailApi.sendTransacEmail(sendSmtpEmail);
    console.log("📧 Brevo sendTransacEmail response info:", info);

    if (prisma && bookingId) {
      await prisma.bookingEmailLog.create({
        data: {
          bookingId,
          type,
          recipient: to,
          subject,
          status: "success",
          metadata: { messageId: info.messageId, hasAttachment: !!attachments },
        },
      });
      try {
        await prisma.emailLog.create({
          data: {
            tenantId: "default",
            bookingId,
            recipient: to,
            subject,
            body: htmlContent || textContent || `Sent template: ${type}`,
            templateName: type ? type.replace(/_/g, " ").toUpperCase() : "Booking Email",
            status: "SENT",
            sentAt: new Date(),
          },
        });
      } catch (_) {}
    }

    return info;
  } catch (error) {
    console.error("❌ SMTP ERROR:", {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    if (prisma && bookingId) {
      await prisma.bookingEmailLog.create({
        data: {
          bookingId,
          type,
          recipient: to,
          subject,
          status: "failed",
          error: error.message,
        },
      });
      try {
        await prisma.emailLog.create({
          data: {
            tenantId: "default",
            bookingId,
            recipient: to,
            subject,
            body: htmlContent || textContent || `Failed template: ${type}`,
            templateName: type ? type.replace(/_/g, " ").toUpperCase() : "Booking Email",
            status: "FAILED",
            error: error.message,
            sentAt: new Date(),
          },
        });
      } catch (_) {}
    }
    throw error;
  }
};

const templates = {
  confirmation: (booking, includeTicket = false) => {
    const trip = booking.tripRef || {};
    const departureDate = booking.departureDate
      ? new Date(booking.departureDate)
      : null;

    let dayOfWeek = "TBD";
    let dayOfMonth = "--";
    let monthName = "TBD";
    let year = "----";

    if (departureDate) {
      dayOfWeek = departureDate
        .toLocaleDateString("en-US", { weekday: "short" })
        .toUpperCase();
      dayOfMonth = departureDate.toLocaleDateString("en-US", {
        day: "2-digit",
      });
      monthName = departureDate
        .toLocaleDateString("en-US", { month: "long" })
        .toUpperCase();
      year = departureDate.getFullYear().toString();
    }

    const meta = booking.sourceMeta || {};
    const storedItems = meta.bookingItems || [];

    const passengersObj =
      booking.passengers && typeof booking.passengers === "object"
        ? booking.passengers
        : booking.passengers && typeof booking.passengers === "string"
          ? JSON.parse(booking.passengers)
          : {};
    const details = passengersObj.details || {};
    const trainClass = booking.trainClass || details.trainClass || "";
    const roomType = booking.roomType || details.roomType || "";

    let basePrice = 0;
    let gstDiscount = 0;
    let priceRowsHtml = "";

    const primaryName = booking.fullName || booking.name || "Valued Traveller";
    const pickupCity =
      booking.pickupCity || trip.location || trip.departureCity || "Ahmedabad";

    const activeItems = storedItems.filter(
      (item) => item.qty > 0 || item.rate < 0,
    );
    const baseItems = activeItems.filter(
      (item) =>
        !(item.name.toLowerCase().includes("discount") || item.rate < 0),
    );
    const discountItems = activeItems.filter(
      (item) => item.name.toLowerCase().includes("discount") || item.rate < 0,
    );

    basePrice = baseItems.reduce((acc, item) => acc + item.rate * item.qty, 0);
    gstDiscount = discountItems.reduce(
      (acc, item) => acc + Math.abs(item.rate * item.qty),
      0,
    );

    if (baseItems.length > 0) {
      baseItems.forEach((item) => {
        const desc = item.name || "Package Line Item";
        priceRowsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <td style="padding: 12px 16px; color: #0f172a; text-align: left; vertical-align: top; font-weight: 700;">
              ${desc}
            </td>
            <td style="padding: 12px 16px; color: #64748b; text-align: center; vertical-align: top; font-weight: 600; font-size: 12px;">
              ${item.qty} &times; ₹${Number(item.rate).toLocaleString("en-IN")}
            </td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 800; text-align: right; vertical-align: top; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px;">
              ₹ ${Number(item.rate * item.qty).toLocaleString("en-IN")}
            </td>
          </tr>
        `;
      });
    } else {
      basePrice = booking.baseAmount || booking.totalAmount || 21499;
      const trainDesc = trainClass
        ? `${trainClass} (${pickupCity} to ${pickupCity}) [${primaryName}]`
        : `NON AC SLEEPER (${pickupCity} to ${pickupCity}) [${primaryName}]`;
      const roomDesc = roomType
        ? `${roomType} [${primaryName}]`
        : `QUAD SHARING [${primaryName}]`;

      priceRowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
          <td style="padding: 12px 16px; color: #0f172a; text-align: left; vertical-align: top; font-weight: 700;">
            ${trainDesc}
          </td>
          <td style="padding: 12px 16px; color: #64748b; text-align: center; vertical-align: top; font-weight: 600; font-size: 12px;">
            1 &times; ₹${Number(basePrice).toLocaleString("en-IN")}
          </td>
          <td style="padding: 12px 16px; color: #0f172a; font-weight: 800; text-align: right; vertical-align: top; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px;">
            ₹ ${Number(basePrice).toLocaleString("en-IN")}
          </td>
        </tr>
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
          <td style="padding: 12px 16px; color: #0f172a; text-align: left; vertical-align: top; font-weight: 700;">
            ${roomDesc}
          </td>
          <td style="padding: 12px 16px; color: #64748b; text-align: center; vertical-align: top; font-weight: 600; font-size: 12px;">
            1 &times; ₹0
          </td>
          <td style="padding: 12px 16px; color: #0f172a; font-weight: 800; text-align: right; vertical-align: top; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 13px;">
            ₹ 0
          </td>
        </tr>
      `;
    }

    if (gstDiscount > 0 || booking.gstDiscount > 0) {
      const discountVal = gstDiscount || booking.gstDiscount || 1075;
      priceRowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
          <td style="padding: 12px 16px; color: #ff5722; text-align: left; font-weight: 800;" colspan="2">
            DISCOUNT
          </td>
          <td style="padding: 12px 16px; color: #ff5722; font-weight: 800; text-align: right; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace;">
            - ₹ ${Number(discountVal).toLocaleString("en-IN")}
          </td>
        </tr>
      `;
    }

    const gstRate =
      booking.baseAmount && booking.gstAmount
        ? Math.round((booking.gstAmount / booking.baseAmount) * 100) / 100
        : 0.05;
    const calculatedGst =
      booking.gstAmount !== null &&
      booking.gstAmount !== undefined &&
      booking.gstAmount > 0
        ? booking.gstAmount
        : Math.round((basePrice - gstDiscount) * gstRate);

    const totalWithGst =
      booking.totalAmount !== null &&
      booking.totalAmount !== undefined &&
      booking.totalAmount > 0
        ? booking.totalAmount
        : basePrice - gstDiscount + calculatedGst;

    const calculatedGstFormatted =
      Number(calculatedGst).toLocaleString("en-IN");
    const totalWithGstFormatted = Number(totalWithGst).toLocaleString("en-IN");

    const gstPct = Math.round(gstRate * 100);
    priceRowsHtml += `
      <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
        <td style="padding: 12px 16px; color: #475569; text-align: left; font-weight: 600;" colspan="2">
          GST (Reg no. 24CRFPP3172G1ZT) @ ${gstPct}%
        </td>
        <td style="padding: 12px 16px; color: #334155; font-weight: 700; text-align: right; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace;">
          ₹ ${calculatedGstFormatted}
        </td>
      </tr>
      <tr style="background-color: #ffffff; font-size: 14px;">
        <td style="padding: 14px 16px; color: #0f172a; text-align: left; font-weight: 900;" colspan="2">
          TOTAL AMOUNT
        </td>
        <td style="padding: 14px 16px; color: #0f172a; font-weight: 900; text-align: right; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace; font-size: 15px;">
          ₹ ${totalWithGstFormatted}
        </td>
      </tr>
    `;

    let passengerRowsHtml = "";
    let passengersList = [];
    try {
      if (booking.passengers) {
        const parsed =
          typeof booking.passengers === "string"
            ? JSON.parse(booking.passengers)
            : booking.passengers;
        if (Array.isArray(parsed)) {
          passengersList = parsed;
        } else if (parsed && typeof parsed === "object") {
          passengersList = parsed.persons || parsed.passengers || [];
        }
      }
    } catch (e) {
      passengersList = [];
    }
    if (!Array.isArray(passengersList)) {
      passengersList = [];
    }

    if (passengersList.length > 0) {
      passengersList.forEach((p) => {
        passengerRowsHtml += `
          <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
            <td style="padding: 12px 16px; color: #0f172a; text-align: left; font-weight: 800;">
              ${p.name || "—"}
            </td>
            <td style="padding: 12px 16px; color: #64748b; text-align: center; font-weight: 600;">
              ${p.age ? p.age + " Yrs" : "—"}
            </td>
            <td style="padding: 12px 16px; color: #0f172a; font-weight: 800; text-align: right;">
              ${p.gender || "—"}
            </td>
          </tr>
        `;
      });
    } else {
      passengerRowsHtml += `
        <tr style="border-bottom: 1px solid #f1f5f9; font-size: 13px;">
          <td style="padding: 12px 16px; color: #0f172a; text-align: left; font-weight: 800;">
            ${primaryName}
          </td>
          <td style="padding: 12px 16px; color: #64748b; text-align: center; font-weight: 600;">
            ${booking.age ? booking.age + " Yrs" : "—"}
          </td>
          <td style="padding: 12px 16px; color: #0f172a; font-weight: 800; text-align: right;">
            ${booking.gender || "—"}
          </td>
        </tr>
      `;
    }

    const heroImage =
      trip.heroImage ||
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb";
    const bookingTokenLink = booking.bookingToken
      ? `${getPublicSiteBaseUrl()}/b/${booking.bookingToken}`
      : `${getPublicSiteBaseUrl()}/my-bookings`;
    const rawTicketStatus = String(
      booking.trainTicketStatus ||
        booking.passengers?.details?.ticketStatus ||
        (includeTicket ? "CONFIRMED" : "RAC"),
    ).replace(/_/g, " ");

    // Smart Payment Mode & Breakdown Resolution
    const rawMode = String(
      booking.paymentMode ||
        booking.payment_method ||
        booking.sourceMeta?.paymentMode ||
        booking.sourceMeta?.paymentMethod ||
        "",
    ).trim();
    const rawNotes = String(
      booking.notes || booking.adminNotes || "",
    ).toLowerCase();
    const rawMeta = booking.sourceMeta || {};

    let resolvedPaymentMode = "UPI / Online Transfer";
    let paymentBadge = "VERIFIED PAYMENT";
    let isCashPayment = false;
    let paymentRefDetail = "";

    const upperMode = rawMode.toUpperCase();
    if (
      upperMode.includes("CASH") ||
      upperMode.includes("OFFICE") ||
      rawNotes.includes("cash") ||
      rawNotes.includes("office payment") ||
      rawNotes.includes("in office") ||
      rawNotes.includes("paid at office") ||
      rawMeta.paymentMode === "CASH"
    ) {
      resolvedPaymentMode = "Cash (Paid at Office)";
      paymentBadge = "OFFICE CASH";
      isCashPayment = true;
      paymentRefDetail =
        rawMeta.cashReceiptNumber ||
        rawMeta.receiptNumber ||
        rawMeta.transactionId ||
        `OFFICE-CASH-${booking.bookingId}`;
    } else if (
      upperMode.includes("BANK") ||
      upperMode.includes("NEFT") ||
      upperMode.includes("IMPS") ||
      upperMode.includes("RTGS") ||
      upperMode.includes("TRANSFER")
    ) {
      resolvedPaymentMode = "Bank Transfer (NEFT / IMPS / RTGS)";
      paymentBadge = "BANK TRANSFER";
      paymentRefDetail =
        booking.upi_reference ||
        rawMeta.transactionId ||
        rawMeta.referenceNumber ||
        "Bank Direct Credit";
    } else if (
      upperMode.includes("CARD") ||
      upperMode.includes("CREDIT") ||
      upperMode.includes("DEBIT")
    ) {
      resolvedPaymentMode = "Debit / Credit Card";
      paymentBadge = "CARD PAYMENT";
      paymentRefDetail =
        booking.upi_reference || rawMeta.transactionId || "Card Payment";
    } else if (
      upperMode.includes("UPI") ||
      upperMode.includes("GPAY") ||
      upperMode.includes("PHONEPE") ||
      upperMode.includes("PAYTM") ||
      booking.upi_reference
    ) {
      resolvedPaymentMode = "UPI / Online Transfer";
      paymentBadge = "UPI VERIFIED";
      paymentRefDetail = booking.upi_reference || rawMeta.utr || "Online Gateway";
    } else if (upperMode === "FULL PAYMENT" || upperMode === "PARTIAL PAYMENT") {
      if (rawNotes.includes("cash")) {
        resolvedPaymentMode = "Cash (Paid at Office)";
        paymentBadge = "OFFICE CASH";
        isCashPayment = true;
      } else {
        resolvedPaymentMode = `Online Transfer (${rawMode})`;
        paymentBadge = "ONLINE TRANSFER";
      }
    }

    const advanceAmount = Number(booking.advancePaid || 0);
    const balanceRemaining = Math.max(
      0,
      Number(
        booking.remainingAmount !== null && booking.remainingAmount !== undefined
          ? booking.remainingAmount
          : totalWithGst - advanceAmount,
      ),
    );

    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmed – ${trip.title || booking.tripName}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 0; -webkit-font-smoothing: antialiased;">
  
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(15, 23, 42, 0.08); border: 1px solid #e2e8f0;">
    
    <!-- 1. Top Brand Header -->
    <div style="background-color: #ffffff; padding: 20px 24px 16px 24px; border-bottom: 1px solid #f1f5f9;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="vertical-align: middle;">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${LOGO_URL}" alt="YOUTHCAMPING" style="height: 36px; width: auto; max-width: 180px; display: block; border: 0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                  <div style="display: none; font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; text-transform: uppercase;">
                    YOUTH<span style="color: #ff5722;">CAMPING</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <span style="display: inline-block; padding: 6px 14px; background-color: #e6f7ed; border: 1px solid #a7f3d0; border-radius: 999px; color: #059669; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
              CONFIRMED BOOKING
            </span>
          </td>
        </tr>
      </table>
    </div>

    <!-- 2. Hero Cover Banner with Badge -->
    <div style="position: relative; background-color: #0f172a; background-image: url('${heroImage}'); background-size: cover; background-position: center; min-height: 170px;">
      <!-- Dark overlay gradient -->
      <table role="presentation" width="100%" height="170" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(to bottom, rgba(15, 23, 42, 0.2), rgba(15, 23, 42, 0.85));">
        <tr>
          <td style="padding: 24px; vertical-align: bottom;">
            <div style="background-color: rgba(15, 23, 42, 0.75); border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 12px; padding: 10px 16px; display: inline-block; backdrop-filter: blur(8px);">
              <div style="display: inline-block; background-color: #ff5722; color: #ffffff; font-size: 9px; font-weight: 900; padding: 2px 7px; border-radius: 5px; letter-spacing: 0.8px; text-transform: uppercase; margin-bottom: 4px;">
                BOOKING ID
              </div>
              <div style="color: #ffffff; font-size: 16px; font-weight: 900; letter-spacing: 0.5px; font-family: 'SF Mono', Consolas, Monaco, monospace;">
                ${booking.bookingId}
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- 3. Trip Heading & Subtitle -->
    <div style="padding: 24px 24px 12px 24px; background-color: #ffffff;">
      <h1 style="font-size: 26px; font-weight: 900; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.5px; line-height: 1.2;">
        ${trip.title || booking.tripName}
      </h1>
      <div style="font-size: 13px; color: #64748b; font-weight: 600;">
        ${pickupCity} &bull; ${passengersList.length || 1} Traveller${(passengersList.length || 1) > 1 ? "s" : ""}
      </div>
    </div>

    <!-- 4. Greeting Copy -->
    <div style="padding: 0 24px 20px 24px; background-color: #ffffff;">
      <p style="font-size: 14px; color: #334155; margin: 0; line-height: 1.6;">
        Dear <strong>${primaryName}</strong>,<br/>
        Your reservation with YouthCamping is officially confirmed!<br/>
        Here is your complete trip breakdown:
      </p>
    </div>

    <!-- 5. Reservation Status & Departure Date Grid -->
    <div style="padding: 0 24px 24px 24px; background-color: #ffffff;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 0;">
        <tr>
          <!-- Statuses Column -->
          <td style="vertical-align: top; width: 58%; padding-right: 8px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; background-color: #ffffff; min-height: 140px; box-sizing: border-box;">
              <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 6px;">
                RESERVATION STATUS
              </div>
              <div style="margin-bottom: 16px;">
                <span style="display: inline-block; padding: 5px 14px; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 999px; color: #059669; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                  CONFIRMED
                </span>
              </div>

              <div style="font-size: 10px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 6px;">
                TICKET STATUS
              </div>
              <div>
                <span style="display: inline-block; padding: 5px 14px; background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; color: #ea580c; font-size: 11px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">
                  ${rawTicketStatus}
                </span>
              </div>
            </div>
          </td>

          <!-- Departure Date Calendar Widget -->
          <td style="vertical-align: top; width: 42%; padding-left: 8px;">
            <div style="border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background-color: #ffffff; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.03);">
              <div style="padding: 14px 10px 10px 10px;">
                <div style="font-size: 9px; font-weight: 900; text-transform: uppercase; color: #64748b; letter-spacing: 0.8px; margin-bottom: 2px;">
                  DEPARTURE DATE
                </div>
                <div style="font-size: 13px; font-weight: 900; color: #ff5722; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${dayOfWeek}
                </div>
                <div style="font-size: 38px; font-weight: 900; color: #0f172a; line-height: 1; margin: 2px 0;">
                  ${dayOfMonth}
                </div>
                <div style="font-size: 11px; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
                  ${monthName}
                </div>
              </div>
              <div style="background-color: #ff5722; color: #ffffff; font-size: 12px; font-weight: 900; padding: 6px 0; letter-spacing: 0.8px;">
                ${year}
              </div>
            </div>
          </td>
        </tr>
      </table>
    </div>

    <!-- 6. Passenger Details Manifest -->
    <div style="padding: 0 24px 24px 24px; background-color: #ffffff;">
      <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.8px; margin-bottom: 8px;">
        PASSENGER DETAILS (${passengersList.length || 1})
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background-color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px 16px; text-align: left; font-weight: 800; width: 50%;">NAME</th>
              <th style="padding: 10px 16px; text-align: center; font-weight: 800; width: 25%;">AGE</th>
              <th style="padding: 10px 16px; text-align: right; font-weight: 800; width: 25%;">GENDER</th>
            </tr>
          </thead>
          <tbody>
            ${passengerRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 7. Itemized Financial Breakdown -->
    <div style="padding: 0 24px 24px 24px; background-color: #ffffff;">
      <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.8px; margin-bottom: 8px;">
        ITEMIZED FINANCIAL BREAKDOWN
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background-color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; border-bottom: 1px solid #e2e8f0;">
              <th style="padding: 10px 16px; text-align: left; font-weight: 800; width: 55%;">DESCRIPTION</th>
              <th style="padding: 10px 16px; text-align: center; font-weight: 800; width: 25%;">QTY / RATE</th>
              <th style="padding: 10px 16px; text-align: right; font-weight: 800; width: 20%;">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            ${priceRowsHtml}
          </tbody>
        </table>
      </div>
    </div>

    <!-- 8. Advance Payment Received & Balance Statement -->
    <div style="padding: 0 24px 24px 24px; background-color: #ffffff;">
      <div style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.8px; margin-bottom: 8px;">
        PAYMENT CONFIRMATION & BREAKDOWN
      </div>
      <div style="border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden; background-color: #ffffff;">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="border-collapse: collapse;">
          <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px 16px; color: #334155; font-size: 12px; font-weight: 700;">
              Payment Method
            </td>
            <td style="padding: 12px 16px; color: #0f172a; font-size: 12px; font-weight: 800; text-align: right;">
              <span style="display: inline-block; padding: 3px 8px; background-color: ${isCashPayment ? "#ecfdf5" : "#eff6ff"}; border: 1px solid ${isCashPayment ? "#a7f3d0" : "#bfdbfe"}; border-radius: 6px; color: ${isCashPayment ? "#059669" : "#2563eb"}; font-size: 10px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase; margin-right: 6px;">
                ${paymentBadge}
              </span>
              ${resolvedPaymentMode}
            </td>
          </tr>
          ${paymentRefDetail ? `
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 16px; color: #64748b; font-size: 12px; font-weight: 600;">
              Reference / Receipt ID
            </td>
            <td style="padding: 10px 16px; color: #0f172a; font-size: 12px; font-weight: 700; text-align: right; font-family: 'SF Mono', Consolas, Monaco, monospace;">
              ${paymentRefDetail}
            </td>
          </tr>
          ` : ""}
          <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 12px 16px; color: #059669; font-size: 13px; font-weight: 800;">
              Amount Received (Advance)
            </td>
            <td style="padding: 12px 16px; color: #059669; font-size: 15px; font-weight: 900; text-align: right; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace;">
              ₹ ${advanceAmount.toLocaleString("en-IN")}
            </td>
          </tr>
          <tr style="background-color: #fffbf7;">
            <td style="padding: 12px 16px; color: #b45309; font-size: 13px; font-weight: 800;">
              Remaining Balance Due
            </td>
            <td style="padding: 12px 16px; color: #b45309; font-size: 15px; font-weight: 900; text-align: right; white-space: nowrap; font-family: 'SF Mono', Consolas, Monaco, monospace;">
              ₹ ${balanceRemaining.toLocaleString("en-IN")}
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- 9. High Impact Call to Action Button -->
    <div style="padding: 0 24px 28px 24px; background-color: #ffffff; text-align: center;">
      <a href="${bookingTokenLink}" target="_blank" style="display: block; width: 100%; box-sizing: border-box; padding: 16px 20px; background-color: #ff5722; color: #ffffff !important; text-decoration: none; border-radius: 12px; font-weight: 900; font-size: 14px; text-transform: uppercase; letter-spacing: 0.8px; text-align: center; box-shadow: 0 6px 16px rgba(255, 87, 34, 0.3);">
        EXPLORE MY TRIP DASHBOARD &nbsp;&rarr;
      </a>
      <div style="font-size: 11px; color: #64748b; margin-top: 10px; font-weight: 500;">
        Access your digital tickets, itinerary, and live departure updates
      </div>
    </div>

    <!-- 10. Footer Section -->
    <div style="background-color: #0f172a; padding: 20px 24px; border-top: 1px solid #1e293b; color: #ffffff;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
        <tr>
          <td style="vertical-align: middle;">
            <table role="presentation" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align: middle;">
                  <img src="${LOGO_URL}" alt="YOUTHCAMPING" style="height: 26px; width: auto; max-width: 140px; display: block; border: 0;" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';" />
                  <div style="display: none; font-size: 16px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px; text-transform: uppercase;">
                    YOUTH<span style="color: #ff5722;">CAMPING</span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
          <td style="text-align: center; vertical-align: middle; color: #94a3b8; font-size: 11px; font-weight: 500;">
            Adventure. Community. Memories.
          </td>
          <td style="text-align: right; vertical-align: middle;">
            <a href="https://instagram.com" target="_blank" style="color: #94a3b8; text-decoration: none; margin-left: 10px; font-size: 11px; font-weight: 600;">Instagram</a>
            <a href="https://youtube.com" target="_blank" style="color: #94a3b8; text-decoration: none; margin-left: 10px; font-size: 11px; font-weight: 600;">YouTube</a>
            <a href="${getPublicSiteBaseUrl()}" target="_blank" style="color: #94a3b8; text-decoration: none; margin-left: 10px; font-size: 11px; font-weight: 600;">Website</a>
          </td>
        </tr>
      </table>
    </div>

  </div>
</body>
</html>
    `;

    return {
      subject: `Booking Confirmed – ${trip.title || booking.tripName}`,
      html: emailContent,
    };
  },

  payment: (booking, amount) => {
    const content = `
      <h1>Payment Received</h1>
      <p>Hi ${booking.fullName},</p>
      <p>We've successfully received your payment of <strong>₹${amount.toLocaleString()}</strong> for your upcoming trip.</p>
      
      <div class="highlight-box">
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
          <div>
            <div class="label">Transaction Amount</div>
            <div class="value">₹${amount.toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Total Paid</div>
            <div class="value">₹${booking.advancePaid.toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Remaining Balance</div>
            <div class="value" style="color: #dc2626">₹${booking.remainingAmount.toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Payment Status</div>
            <div class="value">${booking.paymentStatus}</div>
          </div>
        </div>
      </div>

      <p>Thank you for keeping your payments on track. It helps us secure the best experiences for you.</p>
    `;
    return {
      subject: `Payment Receipt: ${booking.bookingId} - YouthCamping`,
      html: getBaseTemplate(
        content,
        `Payment of ₹${amount} received for booking ${booking.bookingId}`,
      ),
    };
  },

  reminder: (booking) => {
    const trip = booking.tripRef || {};
    const content = `
      <h1>Get Ready for Adventure!</h1>
      <p>Hi ${booking.fullName},</p>
      <p>Your adventure to <strong>${trip.title || booking.tripName || booking.tripId}</strong> is just around the corner! We wanted to send a quick reminder about your upcoming trip.</p>
      
      <div class="highlight-box">
        <div class="label">Trip Detail</div>
        <div class="value">${trip.title || booking.tripName || booking.tripId}</div>
        <div class="label" style="margin-top: 10px;">Boarding City</div>
        <div class="value">${trip.departureCity || booking.boardingCity || "To be updated"}</div>
      </div>

      <p>Make sure you have all your essentials ready. Don't forget to check the weather forecast for your destination!</p>
      
      <a href="${getPublicSiteBaseUrl()}/packing-list" class="button">View Packing List</a>
    `;
    return {
      subject: `Trip Reminder: Your journey to ${trip.title || booking.tripName || booking.tripId} is coming soon!`,
      html: getBaseTemplate(
        content,
        `Are you ready for your trip to ${trip.title || booking.tripName}?`,
      ),
    };
  },

  cancellation: (booking) => {
    const trip = booking.tripRef || {};
    const content = `
      <h1>Booking Cancelled</h1>
      <p>Hi ${booking.fullName},</p>
      <p>Your booking for <strong>${trip.title || booking.tripName || booking.tripId}</strong> (ID: ${booking.bookingId}) has been cancelled as requested or due to pending requirements.</p>
      
      <div class="highlight-box">
        <p style="margin: 0; color: #64748b; font-size: 14px;">If this was a mistake, please contact our support team immediately to restore your booking.</p>
      </div>

      <p>We hope to see you on another adventure soon!</p>
    `;
    return {
      subject: `Booking Cancelled: ${booking.bookingId}`,
      html: getBaseTemplate(
        content,
        `Your booking ${booking.bookingId} has been cancelled.`,
      ),
    };
  },

  invoice: (booking) => {
    const trip = booking.tripRef || {};
    const content = `
      <h1>Your Trip Invoice</h1>
      <p>Hi ${booking.fullName},</p>
      <p>Please find the invoice details for your booking <strong>${booking.bookingId}</strong> below.</p>
      
      <div class="highlight-box">
        <div style="margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;">
          <div class="label">Trip Name</div>
          <div class="value">${trip.title || booking.tripName || booking.tripId}</div>
        </div>
        <div style="display: grid; grid-template-cols: 1fr 1fr; gap: 20px;">
          <div>
            <div class="label">Total Amount</div>
            <div class="value">₹${booking.totalAmount.toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Advance Paid</div>
            <div class="value">₹${booking.advancePaid.toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Balance Due</div>
            <div class="value" style="color: #dc2626">₹${booking.remainingAmount.toLocaleString()}</div>
          </div>
          <div>
            <div class="label">Payment Status</div>
            <div class="value">${booking.paymentStatus}</div>
          </div>
        </div>
      </div>

      <p>We have attached the official PDF invoice to this email for your records.</p>
      
      <div style="text-align: center;">
        <a href="${getPublicSiteBaseUrl()}/my-bookings" class="button">View My Booking</a>
      </div>
    `;
    return {
      subject: `Invoice for Booking ${booking.bookingId} - YouthCamping`,
      html: getBaseTemplate(
        content,
        `Invoice for your trip ${trip.title || booking.tripName}`,
      ),
    };
  },
};

module.exports = {
  sendEmail,
  templates,
};

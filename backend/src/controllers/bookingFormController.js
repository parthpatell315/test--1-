const { prisma } = require("../lib/prisma");
const { syncBookingToSheets } = require("../utils/googleSheetsSync");
const { generateBookingId } = require("../utils/bookingIdGenerator");
const { PAYMENT_STATUS } = require("../utils/paymentStatus");
const { resolveTenantId } = require("../utils/tenantContext");

const fs = require("fs");
const path = require("path");

const dataFile = path.join(__dirname, "..", "..", "bookingForms.json");

// Helper to read/write forms
const getForms = () => {
  try {
    if (!fs.existsSync(dataFile)) fs.writeFileSync(dataFile, "[]");
    return JSON.parse(fs.readFileSync(dataFile, "utf8"));
  } catch (e) {
    return [];
  }
};

const saveForms = (forms) => {
  fs.writeFileSync(dataFile, JSON.stringify(forms, null, 2));
};

exports.createBookingForm = async (req, res, next) => {
  try {
    const { tripName, date, tripId, paymentMode, bookingAmount } = req.body;
    if (!tripName || !date)
      return res
        .status(400)
        .json({ success: false, message: "Trip Name and Date are required" });

    let forms = getForms();
    let form = forms.find((f) => f.tripName === tripName && f.date === date);

    if (!form) {
      form = {
        id: `form_${Date.now()}`,
        tripName,
        date,
        tripId,
        paymentMode: paymentMode || "Full Payment",
        bookingAmount: parseFloat(bookingAmount) || 0,
        formUrl: `https://forms.gle/mock-url-${Date.now()}`,
        sheetUrl: `https://docs.google.com/spreadsheets/d/mock-id-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      forms.push(form);
      saveForms(forms);
    }

    res.json({ success: true, data: form });
  } catch (error) {
    next(error);
  }
};

exports.getBookingForms = async (req, res, next) => {
  try {
    const forms = getForms().sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );
    res.json({ success: true, data: forms });
  } catch (error) {
    next(error);
  }
};

exports.lookupBookingForm = async (req, res, next) => {
  try {
    const { tripName, date } = req.query;
    const form = getForms().find(
      (f) => f.tripName === tripName && f.date === date,
    );
    if (!form)
      return res
        .status(404)
        .json({ success: false, message: "Form not found" });
    res.json({ success: true, data: form });
  } catch (error) {
    next(error);
  }
};

exports.updateBookingForm = async (req, res, next) => {
  try {
    let forms = getForms();
    const index = forms.findIndex(
      (f) => f.id === req.params.id || f._id === req.params.id,
    );
    if (index === -1)
      return res
        .status(404)
        .json({ success: false, message: "Form not found" });

    forms[index] = { ...forms[index], ...req.body };
    saveForms(forms);

    res.json({ success: true, data: forms[index] });
  } catch (error) {
    next(error);
  }
};

exports.deleteBookingForm = async (req, res, next) => {
  try {
    let forms = getForms();
    forms = forms.filter(
      (f) => f.id !== req.params.id && f._id !== req.params.id,
    );
    saveForms(forms);

    res.json({ success: true, message: "Deleted successfully" });
  } catch (error) {
    next(error);
  }
};

exports.getShareMessage = async (req, res) => {
  const { tripName, date, formUrl } = req.body;
  res.json({
    success: true,
    message: `Hello 😊\n\nPlease complete your booking here:\n${formUrl}\n\nTrip: ${tripName}\nDate: ${date}\n\nTeam Trrabb 🏕️`,
  });
};

exports.createPublicBooking = async (req, res, next) => {
  try {
    const {
      name,
      phone,
      email,
      tripName,
      date,
      roomSharing,
      trainOption,
      participantsList,
      specialRequests,
      pickupCity,
      tripId,
      numberOfTravelers,
      baseAmount,
      gstAmount,
      totalAmount,
    } = req.body;

    if (!name || !phone || !tripName) {
      return res
        .status(400)
        .json({ success: false, message: "Name, phone and trip are required" });
    }

    // 1. Determine tripId — exact match only. Never fall back to an arbitrary
    // trip: wrong-trip booking = wrong pricing and corrupted inventory data.
    let finalTripId = tripId;
    let trip = null;

    if (finalTripId && finalTripId !== "manual") {
      trip = await prisma.trip.findUnique({ where: { id: finalTripId } });
    }

    if (!trip && tripName) {
      trip = await prisma.trip.findFirst({ where: { title: tripName } });
    }

    if (!trip) {
      return res.status(400).json({
        success: false,
        message:
          "Selected Trip is invalid or no longer exists in the system",
      });
    }
    finalTripId = trip.id;

    // Look up associated booking link if present to retain internal notes
    let linkedInternalNote =
      req.body.internalNote || req.body.adminNotes || null;
    let sourceBookingLinkId =
      req.body.sourceBookingLinkId || req.body.bookingLinkId || null;
    if (sourceBookingLinkId && !linkedInternalNote) {
      try {
        const bLink = await prisma.bookingLink.findUnique({
          where: { id: sourceBookingLinkId },
        });
        if (bLink && bLink.internalNote) {
          linkedInternalNote = bLink.internalNote;
        }
      } catch (_e) {}
    }

    const finalNotes = specialRequests || linkedInternalNote || "";
    const finalAdminNotes = linkedInternalNote || specialRequests || "";

    const tenantId = resolveTenantId(req);

    let booking;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
      try {
        const currentBookingId = generateBookingId();
        // 3. Save to Prisma
        //
        // SECURITY: this is a public/unauthenticated endpoint. Financial state
        // is ALWAYS set server-side: a fresh booking has no verified payment
        // records, so paymentStatus = UNPAID and advancePaid = 0 regardless of
        // what the client sends. Client-supplied amounts are ignored.
        booking = await prisma.booking.create({
          data: {
            bookingId: currentBookingId,
            tenantId,
            tripId: finalTripId,
            tripName: trip.title,
            name,
            fullName: name,
            phone,
            mobile: phone,
            email,
            numberOfTravelers:
              parseInt(numberOfTravelers) || participantsList?.length || 1,
            totalAmount:
              trip.price !== undefined && trip.price !== null
                ? Number(trip.price) || 0
                : 0,
            amount: 0,
            baseAmount: 0,
            gstAmount: 0,
            advancePaid: 0,
            remainingAmount: 0,
            departureDate: (() => {
              if (!date) return null;
              const d = new Date(date);
              return isNaN(d.getTime()) ? null : d;
            })(),
            pickupCity: pickupCity || null,
            skipDays: 0,
            adjustedPrice: null,
            joiningDate: null,
            status: "pending",
            paymentStatus: PAYMENT_STATUS.UNPAID,
            notes: finalNotes,
            adminNotes: finalAdminNotes,
            sourceBookingLinkId: sourceBookingLinkId || null,
            passengers: {
              details: {
                roomSharing,
                trainOption,
                travelDate: date,
              },
              persons: participantsList || [],
            },
          },
        });
        break;
      } catch (error) {
        attempts++;
        if (
          error.code === "P2002" &&
          error.meta?.target?.includes("bookingId") &&
          attempts < maxAttempts
        ) {
          console.warn(
            `[BOOKING_COLLISION] Retrying custom booking creation. Attempt: ${attempts}`,
          );
          continue;
        }
        if (attempts >= maxAttempts) {
          throw new Error(
            "Server failed to generate a unique booking ID after multiple attempts.",
          );
        }
        throw error;
      }
    }

    // Sync to Google Sheets
    syncBookingToSheets(booking).catch((err) =>
      console.error("[SHEETS_SYNC_SILENT_ERR]", err.message),
    );

    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error("🔥 [PUBLIC BOOKING ERROR]:", error);
    // Return detailed error in dev to fix it faster
    res.status(500).json({
      success: false,
      message: error.message || "Internal Server Error",
      details:
        error.code === "P2003"
          ? "Foreign Key Constraint failed - Trip ID might not exist"
          : error.message,
    });
  }
};

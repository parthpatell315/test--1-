const { prisma } = require('../lib/prisma');
const { runAutoAllocation } = require('../utils/autoAllocationEngine');
const { calculateHotelStayCost } = require('../utils/hotelStayCost');
const { mirrorConfirmedRooms } = require('../utils/roomAllocationAuthority');
const { withProfitFields } = require('../utils/profitVisibility');
const opsSummaryCache = new Map();

/**
 * Shared server-side India timezone (Asia/Kolkata) normalization method for departure calendar dates.
 * Converts input timestamps or dates (e.g. 2026-07-09T18:30:00.000Z, 2026-07-10T00:00:00.000Z, 2026-07-10T05:30:00.000Z)
 * to one exact normalized India calendar Date (YYYY-MM-DDT00:00:00.000Z).
 */
function normalizeDepartureDateIndia(dateInput) {
  if (!dateInput) return null;

  // If it's already a simple YYYY-MM-DD string, parse directly in UTC to avoid any locale/Intl issues
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const directDate = new Date(`${dateInput}T00:00:00.000Z`);
    if (!isNaN(directDate.getTime())) return directDate;
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;

  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
    const indiaDateStr = formatter.format(d); // e.g. "2026-07-10"
    const resDate = new Date(`${indiaDateStr}T00:00:00.000Z`);
    if (!isNaN(resDate.getTime())) return resDate;
  } catch (e) {
    console.error('Intl formatting error in normalizeDepartureDateIndia:', e);
  }

  // Fallback to UTC parts if Intl formatting fails
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const fallbackDate = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
  return isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

// Helper to construct departure filter
async function parseDepartureFilter(req, res, requireDepartureDate = true) {
  const { tripId: rawTripId } = req.params;
  const rawDate = req.query.departureDate || req.body.departureDate;

  if (requireDepartureDate && !rawDate) {
    res.status(400).json({ success: false, message: 'departureDate is required for departure operations' });
    return null;
  }

  const departureDate = normalizeDepartureDateIndia(rawDate);
  if (requireDepartureDate && (!departureDate || isNaN(departureDate.getTime()))) {
    res.status(400).json({ success: false, message: 'Invalid departureDate format' });
    return null;
  }

  const tenantId = req.user?.tenantId || 'default';

  if (!rawTripId || rawTripId === 'undefined') {
    res.status(400).json({ success: false, message: 'tripId is required and must be valid' });
    return null;
  }

  if (!rawTripId || rawTripId === 'undefined') {
    res.status(400).json({ success: false, message: 'tripId is required and must be valid' });
    return null;
  }

  let tripId = rawTripId;
  if (rawTripId) {
    // 1. Try exact/slug/shortName match
    let trip = await prisma.trip.findFirst({
      where: {
        tenantId,
        OR: [
          { id: rawTripId },
          { slug: rawTripId },
          { shortName: rawTripId }
        ]
      },
      select: { id: true }
    });

    // 2. Resolve departure code to trip if not found exactly (e.g. MKA-0705 -> MKA)
    if (!trip && rawTripId.includes('-')) {
      const parts = rawTripId.split('-');
      const prefix = parts[0].toUpperCase();
      trip = await prisma.trip.findFirst({
        where: {
          tenantId,
          OR: [
            { id: { startsWith: prefix, mode: 'insensitive' } },
            { id: { startsWith: prefix + '-', mode: 'insensitive' } },
            { slug: { startsWith: prefix.toLowerCase(), mode: 'insensitive' } },
            { shortName: { startsWith: prefix, mode: 'insensitive' } }
          ]
        },
        select: { id: true }
      });
    }

    if (trip) {
      tripId = trip.id;
    } else {
      res.status(404).json({
        success: false,
        code: 'TRIP_NOT_FOUND',
        message: `The trip matching identifier '${rawTripId}' could not be resolved.`
      });
      return null;
    }
  }

  const where = { tenantId, tripId };
  if (departureDate) where.departureDate = departureDate;

  let bookingWhere = { tenantId, tripId, status: { notIn: ['cancelled', 'rejected'] } };
  if (departureDate) {
    const startOfDay = new Date(departureDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(departureDate);
    endOfDay.setUTCHours(23, 59, 59, 999);
    bookingWhere.departureDate = { gte: startOfDay, lte: endOfDay };
  }

  return { tenantId, tripId, departureDate, where, bookingWhere };
}

// ── VENDORS DIRECTORY ──
exports.getVendors = async (req, res) => {
  try {
    const { type } = req.query;
    const where = { tenantId: req.user.tenantId || 'default' };
    if (type) where.type = type;

    const vendors = await prisma.opsVendor.findMany({ where, orderBy: { name: 'asc' } });
    return res.json({ success: true, data: vendors });
  } catch (err) {
    console.error('getVendors error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendors' });
  }
};

exports.createVendor = async (req, res) => {
  try {
    const { name, type, contactPerson, email, phone, location, rating, notes } = req.body;
    const vendor = await prisma.opsVendor.create({
      data: {
        tenantId: req.user.tenantId || 'default',
        name,
        type,
        contactPerson,
        email,
        phone,
        location,
        rating: rating ? parseFloat(rating) : 5.0,
        notes
      }
    });
    return res.status(201).json({ success: true, data: vendor });
  } catch (err) {
    console.error('createVendor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create vendor' });
  }
};

// ── DAY ITINERARY GRID ──
exports.getDayItinerary = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const items = await prisma.opsDayItinerary.findMany({ where: ctx.where, orderBy: { date: 'asc' } });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getDayItinerary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch day itinerary' });
  }
};

function normalizeOpsDayTitle(raw) {
  const t = String(raw || "").toLowerCase().replace(/\s+/g, " ").trim();
  const m = t.match(/day\s*0*(\d+)/);
  return m ? `day ${m[1]}` : t;
}

function opsDayDateKey(raw) {
  if (!raw) return "";
  const d = raw instanceof Date ? raw : new Date(raw);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

exports.upsertDayItinerary = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const { id, date, dayTitle, paxCount, hotelName, hotelVerified, vehicleType, vehicleVerified, remarks, guideDriverDetails, guideVerified, checkInDone } = req.body;

    const dayDate = date ? (normalizeDepartureDateIndia(date) || new Date(date)) : null;
    const titleKey = normalizeOpsDayTitle(dayTitle);
    const dateKey = opsDayDateKey(dayDate);

    const existingRows = await prisma.opsDayItinerary.findMany({
      where: ctx.where,
      orderBy: { updatedAt: "desc" },
    });
    const matched =
      (id && existingRows.find((r) => r.id === id)) ||
      existingRows.find((r) => normalizeOpsDayTitle(r.dayTitle) === titleKey) ||
      (dateKey && existingRows.find((r) => opsDayDateKey(r.date) === dateKey)) ||
      null;

    const data = {
      date: dayDate && !isNaN(dayDate.getTime()) ? dayDate : matched?.date || null,
      dayTitle: dayTitle || matched?.dayTitle || "Day",
      paxCount: paxCount !== undefined ? paxCount : matched?.paxCount || 0,
      hotelName: hotelName !== undefined ? hotelName : matched?.hotelName,
      hotelVerified: hotelVerified !== undefined ? !!hotelVerified : matched?.hotelVerified ?? false,
      vehicleType: vehicleType !== undefined ? vehicleType : matched?.vehicleType,
      vehicleVerified: vehicleVerified !== undefined ? !!vehicleVerified : matched?.vehicleVerified ?? false,
      remarks: remarks !== undefined ? remarks : matched?.remarks,
      guideDriverDetails: guideDriverDetails !== undefined ? guideDriverDetails : matched?.guideDriverDetails,
      guideVerified: guideVerified !== undefined ? !!guideVerified : matched?.guideVerified ?? false,
      checkInDone: checkInDone !== undefined ? !!checkInDone : matched?.checkInDone ?? false,
    };

    let result;
    if (matched) {
      result = await prisma.opsDayItinerary.update({
        where: { id: matched.id },
        data,
      });
    } else {
      result = await prisma.opsDayItinerary.create({
        data: {
          tenantId: ctx.tenantId,
          tripId: ctx.tripId,
          departureDate: ctx.departureDate,
          ...data,
        },
      });
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('upsertDayItinerary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save day itinerary row' });
  }
};

// ── TRIP EXPENSE GRID ──
exports.getTripExpenses = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const expenses = await prisma.opsTripExpense.findMany({ where: ctx.where, orderBy: { serviceDate: 'asc' } });
    return res.json({ success: true, data: expenses });
  } catch (err) {
    console.error('getTripExpenses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch trip expenses' });
  }
};

exports.upsertTripExpense = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const { id, serviceDate, activity, paymentDate, totalAmount, amountPaid, remarks } = req.body;

    const tot = parseFloat(totalAmount || 0);
    const paid = parseFloat(amountPaid || 0);
    const due = tot - paid;
    const paymentStatus = due <= 0 ? 'Paid' : paid > 0 ? 'Partially Paid' : 'Due';

    let result;
    if (id) {
      result = await prisma.opsTripExpense.update({
        where: { id },
        data: { serviceDate: serviceDate ? new Date(serviceDate) : null, activity, paymentDate: paymentDate ? new Date(paymentDate) : null, totalAmount: tot, amountPaid: paid, dueAmount: due, paymentStatus, remarks }
      });
    } else {
      result = await prisma.opsTripExpense.create({
        data: {
          tenantId: ctx.tenantId,
          tripId: ctx.tripId,
          departureDate: ctx.departureDate,
          serviceDate: serviceDate ? new Date(serviceDate) : null,
          activity,
          paymentDate: paymentDate ? new Date(paymentDate) : null,
          totalAmount: tot,
          amountPaid: paid,
          dueAmount: due,
          paymentStatus,
          remarks
        }
      });
    }
    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('upsertTripExpense error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save trip expense row' });
  }
};

exports.deleteDayItinerary = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.opsDayItinerary.deleteMany({ where: { id } });
    return res.json({ success: true, message: 'Itinerary row deleted' });
  } catch (err) {
    console.error('deleteDayItinerary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete itinerary row' });
  }
};

exports.deleteTripExpense = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.opsTripExpense.deleteMany({ where: { id } });
    return res.json({ success: true, message: 'Expense row deleted' });
  } catch (err) {
    console.error('deleteTripExpense error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete expense row' });
  }
};

// ── HOTEL BOOKINGS TRACKER ──
exports.getHotelBookings = async (req, res) => {
  let ctx = null;
  try {
    ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const bookings = await prisma.opsHotelBooking.findMany({
      where: ctx.where,
      include: { vendor: true, overrides: true }
    });
    if (!bookings || bookings.length === 0) {
      return res.json({ success: true, data: [], message: "No hotel selections created yet" });
    }
    return res.json({ success: true, data: bookings });
  } catch (err) {
    console.error("Departure hotel fetch failed", {
      departureId: ctx ? `${ctx.tripId}-${ctx.departureDate?.toISOString().substring(0, 10)}` : 'UNKNOWN',
      tripId: ctx?.tripId || 'UNKNOWN',
      departureDate: ctx?.departureDate || 'UNKNOWN',
      error: err.message
    });
    return res.status(500).json({ success: false, message: 'Failed to fetch hotel bookings' });
  }
};

exports.createHotelBooking = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return; // parseDepartureFilter handles error response (400/404)

    // Accept either array under "hotels" or fallback to single object in body
    let hotelList = req.body.hotels;
    if (!hotelList) {
      // Fallback/backward compatibility for single object payload
      hotelList = [req.body];
    }

    if (!Array.isArray(hotelList)) {
      return res.status(400).json({ success: false, message: "hotels parameter must be an array of hotel booking objects." });
    }

    // Validate duplicate check-in dates in the incoming request
    const checkInDates = new Set();
    for (const h of hotelList) {
      if (h.checkIn) {
        const dateStr = new Date(h.checkIn).toISOString().substring(0, 10);
        if (checkInDates.has(dateStr)) {
          return res.status(400).json({ success: false, message: `Duplicate hotel allocations detected for check-in date ${dateStr}.` });
        }
        checkInDates.add(dateStr);
      }
    }

    // Pre-validate all items before executing any database changes
    for (const h of hotelList) {
      const adv = parseFloat(h.advancePaid || 0);
      const dRooms = parseInt(h.doubleRoomsCount || 0);
      const tRooms = parseInt(h.tripleRoomsCount || 0);
      const qRooms = parseInt(h.quadRoomsCount || 0);
      const exPax = parseInt(h.extraPersonsCount || 0);
      const nights = (h.nightsCount !== undefined && h.nightsCount !== null) ? parseInt(h.nightsCount) : 1;

      if (dRooms < 0 || tRooms < 0 || qRooms < 0 || exPax < 0) {
        return res.status(400).json({ success: false, message: "Passenger counts must be non-negative integers." });
      }

      const dRate = parseFloat(h.doubleRate ?? 0);
      const tRate = parseFloat(h.tripleRate ?? 0);
      const qRate = parseFloat(h.quadRate ?? 0);
      const exRate = parseFloat(h.extraBedRate ?? h.extraPersonRate ?? 0);

      if (dRate < 0 || tRate < 0 || qRate < 0 || exRate < 0) {
        return res.status(400).json({ success: false, message: "Rates must be non-negative numbers." });
      }

      if (nights < 1) {
        return res.status(400).json({ success: false, message: "Nights must be at least 1." });
      }

      if (h.checkIn && h.checkOut) {
        const cin = new Date(h.checkIn);
        const cout = new Date(h.checkOut);
        if (cout <= cin) {
          return res.status(400).json({ success: false, message: "Check-out date must be after check-in date." });
        }
      }

      // Validate vendor existence & type
      if (h.vendorId) {
        const dbVendor = await prisma.opsVendor.findUnique({ where: { id: h.vendorId } });
        if (!dbVendor) {
          return res.status(400).json({ success: false, message: `Selected vendor ${h.vendorId} does not exist in directory.` });
        }
        if (dbVendor.type !== "HOTEL") {
          return res.status(400).json({ success: false, message: "Selected vendor is not a hotel vendor." });
        }
      }

      // Validate booking ID belongs to selected trip
      if (h.id && !h.id.startsWith('stay')) {
        const existing = await prisma.opsHotelBooking.findUnique({ where: { id: h.id } });
        if (!existing) {
          return res.status(404).json({ success: false, message: `Hotel booking record not found for ID: ${h.id}` });
        }
        if (existing.tripId !== ctx.tripId) {
          return res.status(400).json({ success: false, message: "Hotel allocation does not belong to the selected trip." });
        }
        const existingDateStr = existing.departureDate.toISOString().substring(0, 10);
        const ctxDateStr = ctx.departureDate.toISOString().substring(0, 10);
        if (existingDateStr !== ctxDateStr) {
          return res.status(400).json({ success: false, message: "Hotel allocation departure date mismatch." });
        }
      }
    }

    const savedBookings = [];

    // Run safe transaction for all upserts
    await prisma.$transaction(async (tx) => {
      for (const h of hotelList) {
        const adv = parseFloat(h.advancePaid || 0);
        const dRooms = parseInt(h.doubleRoomsCount || 0);
        const tRooms = parseInt(h.tripleRoomsCount || 0);
        const qRooms = parseInt(h.quadRoomsCount || 0);
        const exPax = parseInt(h.extraPersonsCount || 0);
        const nights = (h.nightsCount !== undefined && h.nightsCount !== null) ? parseInt(h.nightsCount) : 1;

        const dRate = parseFloat(h.doubleRate ?? 0);
        const tRate = parseFloat(h.tripleRate ?? 0);
        const qRate = parseFloat(h.quadRate ?? 0);
        const exRate = parseFloat(h.extraBedRate ?? h.extraPersonRate ?? 0);

        // Must match Hotel Assignment wizard:
        // per-person = rooms × occupancy × rate × nights
        // room-wise  = rooms × rate × nights
        let calculatedCost = calculateHotelStayCost({
          pricingMethod: h.pricingMethod,
          totalAmount: h.totalAmount,
          doubleRoomsCount: dRooms,
          tripleRoomsCount: tRooms,
          quadRoomsCount: qRooms,
          extraPersonsCount: exPax,
          nightsCount: nights,
          doubleRate: dRate,
          tripleRate: tRate,
          quadRate: qRate,
          extraBedRate: exRate,
        });

        // Apply overrides if existing
        if (h.id && !h.id.startsWith('stay')) {
          const existingOverrides = await tx.departureHotelRateOverride.findMany({
            where: { departureHotelId: h.id }
          });
          if (existingOverrides.length > 0) {
            calculatedCost = existingOverrides[0].overriddenValue;
          }
        }

        const dataObj = {
          vendorId: h.vendorId || null,
          hotelName: h.hotelName,
          location: h.location,
          checkIn: h.checkIn ? new Date(h.checkIn) : null,
          checkOut: h.checkOut ? new Date(h.checkOut) : null,
          roomType: h.roomType,
          numberOfRooms: parseInt(h.numberOfRooms || 1),
          confirmed: h.confirmed || 'UNCONFIRMED',
          totalAmount: calculatedCost,
          advancePaid: adv,
          balanceAmount: calculatedCost - adv,
          contactPerson: h.contactPerson || null,
          contactPhone: h.contactPhone || null,
          notes: h.notes,
          pricingMethod: h.pricingMethod || 'room-wise',
          doubleRoomsCount: dRooms,
          tripleRoomsCount: tRooms,
          quadRoomsCount: qRooms,
          extraPersonsCount: exPax,
          nightsCount: nights,
          doubleRate: dRate,
          tripleRate: tRate,
          quadRate: qRate,
          extraBedRate: exRate
        };

        let booking;
        if (h.id && !h.id.startsWith('stay')) {
          booking = await tx.opsHotelBooking.update({
            where: { id: h.id },
            data: dataObj,
            include: { overrides: true }
          });
        } else {
          booking = await tx.opsHotelBooking.create({
            data: {
              tenantId: ctx.tenantId,
              tripId: ctx.tripId,
              departureDate: ctx.departureDate,
              ...dataObj
            },
            include: { overrides: true }
          });
        }
        savedBookings.push(booking);
      }
    });

    return res.status(201).json({ success: true, data: savedBookings });
  } catch (err) {
    console.error('createHotelBooking error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};


exports.deleteHotelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.opsHotelBooking.deleteMany({ where: { id } });
    return res.json({ success: true, message: 'Hotel booking deleted' });
  } catch (err) {
    console.error('deleteHotelBooking error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete hotel booking' });
  }
};

// ── TRANSPORT FLEET TRACKER ──
exports.getTransportFleet = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const fleet = await prisma.opsTransportFleet.findMany({ where: ctx.where, include: { vendor: true } });
    return res.json({ success: true, data: fleet });
  } catch (err) {
    console.error('getTransportFleet error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch transport fleet' });
  }
};

exports.createTransportFleet = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const {
      vehicleType, vehicleNumber, vendorId, capacity,
      route, pickupPoints, dropPoints,
      reportingTime, departureTime, confirmationStatus, paymentDueDate,
      totalAmount, advancePaid, driverName, driverPhone, notes
    } = req.body;

    if (!vehicleType) return res.status(400).json({ success: false, message: 'vehicleType is required' });

    // Validate vendor type
    if (vendorId) {
      const vendor = await prisma.opsVendor.findUnique({ where: { id: vendorId }, select: { type: true, isActive: true } });
      if (!vendor) return res.status(400).json({ success: false, message: 'Vendor not found' });
      if (vendor.type !== 'TRANSPORT') return res.status(400).json({ success: false, message: `Vendor type must be TRANSPORT, got ${vendor.type}` });
      if (!vendor.isActive) return res.status(400).json({ success: false, message: 'Vendor is inactive' });
    }

    const tot = parseFloat(totalAmount || 0);
    const adv = parseFloat(advancePaid || 0);
    const cap = parseInt(capacity || 13);
    if (tot < 0) return res.status(400).json({ success: false, message: 'totalAmount cannot be negative' });
    if (adv < 0) return res.status(400).json({ success: false, message: 'advancePaid cannot be negative' });
    if (adv > tot) return res.status(400).json({ success: false, message: 'advancePaid cannot exceed totalAmount' });
    if (cap < 1 || cap > 60) return res.status(400).json({ success: false, message: 'capacity must be between 1 and 60' });

    const vehicle = await prisma.opsTransportFleet.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        vendorId: vendorId || null,
        vehicleType,
        vehicleNumber: vehicleNumber || null,
        capacity: cap,
        route: route || null,
        pickupPoints: pickupPoints || null,
        dropPoints: dropPoints || null,
        reportingTime: reportingTime || null,
        departureTime: departureTime || null,
        confirmationStatus: confirmationStatus || 'UNCONFIRMED',
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
        totalAmount: tot,
        advancePaid: adv,
        balanceAmount: tot - adv,
        driverName: driverName || null,
        driverPhone: driverPhone || null,
        notes: notes || null
      },
      include: { vendor: { select: { id: true, name: true, phone: true } } }
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (err) {
    console.error('createTransportFleet error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create transport fleet' });
  }
};

exports.deleteTransportFleet = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.opsTransportFleet.deleteMany({ where: { id } });
    return res.json({ success: true, message: 'Transport vehicle deleted' });
  } catch (err) {
    console.error('deleteTransportFleet error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete transport vehicle' });
  }
};

exports.updateTransportFleet = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      vehicleType, vehicleNumber, capacity, vendorId,
      route, pickupPoints, dropPoints,
      reportingTime, departureTime, confirmationStatus, paymentDueDate,
      totalAmount, advancePaid, driverName, driverPhone, notes
    } = req.body;
    const existing = await prisma.opsTransportFleet.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Transport vehicle not found' });

    // Validate vendor type if changing vendorId
    if (vendorId !== undefined && vendorId !== null) {
      const vendor = await prisma.opsVendor.findUnique({ where: { id: vendorId }, select: { type: true, isActive: true } });
      if (!vendor) return res.status(400).json({ success: false, message: 'Vendor not found' });
      if (vendor.type !== 'TRANSPORT') return res.status(400).json({ success: false, message: `Vendor type must be TRANSPORT, got ${vendor.type}` });
      if (!vendor.isActive) return res.status(400).json({ success: false, message: 'Vendor is inactive' });
    }

    const tot = totalAmount !== undefined ? parseFloat(totalAmount) : existing.totalAmount;
    const adv = advancePaid !== undefined ? parseFloat(advancePaid) : existing.advancePaid;
    if (tot < 0) return res.status(400).json({ success: false, message: 'totalAmount cannot be negative' });
    if (adv < 0) return res.status(400).json({ success: false, message: 'advancePaid cannot be negative' });
    if (adv > tot) return res.status(400).json({ success: false, message: 'advancePaid cannot exceed totalAmount' });

    const updated = await prisma.opsTransportFleet.update({
      where: { id },
      data: {
        vehicleType: vehicleType !== undefined ? vehicleType : undefined,
        vehicleNumber: vehicleNumber !== undefined ? vehicleNumber : undefined,
        capacity: capacity !== undefined ? parseInt(capacity) : undefined,
        vendorId: vendorId !== undefined ? (vendorId || null) : undefined,
        route: route !== undefined ? route : undefined,
        pickupPoints: pickupPoints !== undefined ? pickupPoints : undefined,
        dropPoints: dropPoints !== undefined ? dropPoints : undefined,
        reportingTime: reportingTime !== undefined ? reportingTime : undefined,
        departureTime: departureTime !== undefined ? departureTime : undefined,
        confirmationStatus: confirmationStatus !== undefined ? confirmationStatus : undefined,
        paymentDueDate: paymentDueDate !== undefined ? (paymentDueDate ? new Date(paymentDueDate) : null) : undefined,
        totalAmount: tot,
        advancePaid: adv,
        balanceAmount: tot - adv,
        driverName: driverName !== undefined ? driverName : undefined,
        driverPhone: driverPhone !== undefined ? driverPhone : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: { vendor: { select: { id: true, name: true, phone: true } } }
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateTransportFleet error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update transport vehicle' });
  }
};

// ── TRANSPORT PASSENGER GROUPS (by pickup/joining city) ──
exports.getTransportPassengerGroups = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    // Load all bookings for this departure with pickupCity
    const bookings = await prisma.booking.findMany({
      where: {
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        status: { notIn: ['cancelled', 'refunded'] }
      },
      select: {
        bookingId: true, name: true, fullName: true, phone: true, pickupCity: true,
        numberOfTravelers: true, passengers: true, status: true
      },
      orderBy: { pickupCity: 'asc' }
    });

    // Load current active vehicle allocations
    const activeAllocations = await prisma.opsVehicleAllocation.findMany({
      where: { tripId: ctx.tripId, departureDate: ctx.departureDate, allocationStatus: 'ACTIVE' },
      select: { bookingId: true, travelerName: true, fleetId: true, pickupPoint: true }
    });
    const allocatedKeys = new Set(activeAllocations.map(a => `${a.bookingId}:${a.travelerName}`));

    // Group by pickupCity
    const groups = {};
    for (const b of bookings) {
      const city = b.pickupCity || 'Not Specified';
      if (!groups[city]) groups[city] = { city, count: 0, bookings: [], unallocated: 0 };
      const paxCount = b.numberOfTravelers || 1;
      groups[city].count += paxCount;
      groups[city].bookings.push({
        bookingId: b.bookingId,
        name: b.fullName || b.name,
        phone: b.phone,
        travelers: paxCount,
        status: b.status
      });
      groups[city].unallocated += paxCount; // will subtract below
    }

    // Subtract allocated passengers
    for (const a of activeAllocations) {
      const booking = bookings.find(b => b.bookingId === a.bookingId);
      const city = booking?.pickupCity || 'Not Specified';
      if (groups[city]) groups[city].unallocated = Math.max(0, groups[city].unallocated - 1);
    }

    // Load fleet summary for this departure
    const fleets = await prisma.opsTransportFleet.findMany({
      where: { tripId: ctx.tripId, departureDate: ctx.departureDate },
      select: { id: true, vehicleType: true, vehicleNumber: true, capacity: true, route: true, driverName: true, confirmationStatus: true }
    });
    const fleetWithCounts = fleets.map(f => ({
      ...f,
      assigned: activeAllocations.filter(a => a.fleetId === f.id).length,
      remaining: f.capacity - activeAllocations.filter(a => a.fleetId === f.id).length
    }));

    return res.json({
      success: true,
      data: {
        passengerGroups: Object.values(groups).sort((a, b) => b.count - a.count),
        totalPassengers: bookings.reduce((s, b) => s + (b.numberOfTravelers || 1), 0),
        totalAllocated: activeAllocations.length,
        totalUnallocated: bookings.reduce((s, b) => s + (b.numberOfTravelers || 1), 0) - activeAllocations.length,
        fleetSummary: fleetWithCounts,
        totalCapacity: fleets.reduce((s, f) => s + f.capacity, 0)
      }
    });
  } catch (err) {
    console.error('getTransportPassengerGroups error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch passenger groups' });
  }
};

// ── GUIDE PAYMENTS TRACKER ──
exports.getGuidePayments = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const payments = await prisma.opsGuidePayment.findMany({
      where: ctx.where,
      include: { guideAdmin: { select: { id: true, name: true } }, vendor: true, approvedBy: { select: { id: true, name: true } } }
    });
    return res.json({ success: true, data: payments });
  } catch (err) {
    console.error('getGuidePayments error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch guide payments' });
  }
};

exports.createGuidePayment = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const {
      guideName, guideAdminId, vendorId,
      assignmentType, assignmentStatus,
      startDate, endDate, reportingLocation, reportingTime, emergencyContact,
      daysWorked, agreedAmount, advancePaid, notes
    } = req.body;

    if (!guideName?.trim()) return res.status(400).json({ success: false, message: 'guideName is required' });

    // Validate Admin directory lookup if guideAdminId provided
    let resolvedName = guideName;
    if (guideAdminId) {
      const admin = await prisma.admin.findUnique({ where: { id: guideAdminId }, select: { id: true, name: true, isActive: true } });
      if (!admin) return res.status(400).json({ success: false, message: 'Guide (Admin) not found in directory' });
      if (!admin.isActive) return res.status(400).json({ success: false, message: 'This admin/guide is inactive' });
      resolvedName = admin.name || guideName; // use directory name

      // Warn: prevent duplicate CONFIRMED/ASSIGNED assignment for same Admin+departure
      const existingAssignment = await prisma.opsGuidePayment.findFirst({
        where: {
          tripId: ctx.tripId, departureDate: ctx.departureDate,
          guideAdminId,
          assignmentStatus: { in: ['ASSIGNED', 'CONFIRMED', 'ACCEPTED'] }
        }
      });
      if (existingAssignment) {
        return res.status(400).json({
          success: false,
          message: `${resolvedName} is already assigned to this departure (status: ${existingAssignment.assignmentStatus}). Cancel the existing assignment before re-assigning.`
        });
      }
    }

    const agreed = parseFloat(agreedAmount || 0);
    const adv = parseFloat(advancePaid || 0);
    if (adv > agreed) return res.status(400).json({ success: false, message: 'advancePaid cannot exceed agreedAmount' });

    const payment = await prisma.opsGuidePayment.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        guideAdminId: guideAdminId || null,
        vendorId: vendorId || null,
        guideName: resolvedName,
        assignmentType: assignmentType || 'PRIMARY_GUIDE',
        assignmentStatus: assignmentStatus || 'ASSIGNED',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reportingLocation: reportingLocation || null,
        reportingTime: reportingTime || null,
        emergencyContact: emergencyContact || null,
        daysWorked: parseInt(daysWorked || 1),
        agreedAmount: agreed,
        advancePaid: adv,
        balanceAmount: agreed - adv,
        notes: notes || null
      },
      include: { guideAdmin: { select: { id: true, name: true, email: true } } }
    });
    return res.status(201).json({ success: true, data: payment });
  } catch (err) {
    console.error('createGuidePayment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create guide payment' });
  }
};

exports.updateGuidePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      guideName, guideAdminId, vendorId,
      assignmentType, assignmentStatus,
      startDate, endDate, reportingLocation, reportingTime, emergencyContact,
      daysWorked, agreedAmount, advancePaid, paymentStatus, notes
    } = req.body;
    const existing = await prisma.opsGuidePayment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Guide payment not found' });

    const agreed = agreedAmount !== undefined ? parseFloat(agreedAmount) : existing.agreedAmount;
    const adv = advancePaid !== undefined ? parseFloat(advancePaid) : existing.advancePaid;
    if (adv > agreed) return res.status(400).json({ success: false, message: 'advancePaid cannot exceed agreedAmount' });

    const updated = await prisma.opsGuidePayment.update({
      where: { id },
      data: {
        guideName: guideName !== undefined ? guideName : undefined,
        guideAdminId: guideAdminId !== undefined ? (guideAdminId || null) : undefined,
        vendorId: vendorId !== undefined ? (vendorId || null) : undefined,
        assignmentType: assignmentType !== undefined ? assignmentType : undefined,
        assignmentStatus: assignmentStatus !== undefined ? assignmentStatus : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        reportingLocation: reportingLocation !== undefined ? reportingLocation : undefined,
        reportingTime: reportingTime !== undefined ? reportingTime : undefined,
        emergencyContact: emergencyContact !== undefined ? emergencyContact : undefined,
        daysWorked: daysWorked !== undefined ? parseInt(daysWorked) : undefined,
        agreedAmount: agreed,
        advancePaid: adv,
        balanceAmount: agreed - adv,
        paymentStatus: paymentStatus !== undefined ? paymentStatus : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: { guideAdmin: { select: { id: true, name: true, email: true } } }
    });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateGuidePayment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update guide payment' });
  }
};

exports.deleteGuidePayment = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.opsGuidePayment.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Guide payment not found' });
    // Soft-cancel to preserve history; actual delete only if no financial data
    const hasFinancials = existing.agreedAmount > 0 || existing.advancePaid > 0;
    if (hasFinancials) {
      await prisma.opsGuidePayment.update({
        where: { id },
        data: { assignmentStatus: 'CANCELLED' }
      });
      return res.json({ success: true, message: 'Guide assignment cancelled (financial record preserved)' });
    }
    await prisma.opsGuidePayment.delete({ where: { id } });
    return res.json({ success: true, message: 'Guide payment deleted' });
  } catch (err) {
    console.error('deleteGuidePayment error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete guide payment' });
  }
};

// ── OPERATIONAL ACCOUNTING SUMMARY (DEPARTURE SCOPED) ──
exports.getOpsAccountingSummary = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    const bookingWhere = ctx.bookingWhere;

    let hotels = [], transport = [], guides = [], misc = [], expenses = [], bookings = [];
    try {
      [hotels, transport, guides, misc, expenses, bookings] = await Promise.all([
        prisma.opsHotelBooking.findMany({ where: ctx.where }).catch(() => []),
        prisma.opsTransportFleet.findMany({ where: ctx.where }).catch(() => []),
        prisma.opsGuidePayment.findMany({ where: ctx.where }).catch(() => []),
        prisma.opsMiscExpense.findMany({ where: ctx.where }).catch(() => []),
        prisma.opsTripExpense.findMany({ where: ctx.where }).catch(() => []),
        prisma.booking.findMany({ where: bookingWhere }).catch(() => [])
      ]);
    } catch (e) {
      console.error('Sub-query fetch warning in getOpsAccountingSummary:', e);
    }

    const hotelCost = (hotels || []).reduce((s, h) => s + (Number(h.totalAmount) || 0), 0);
    const transportCost = (transport || []).reduce((s, t) => s + (Number(t.totalAmount) || 0), 0);
    const guideCost = (guides || []).reduce((s, g) => s + (Number(g.agreedAmount) || 0), 0);
    const miscCost = (misc || []).reduce((s, m) => s + (Number(m.amount) || 0), 0);
    const detailedExpensesCost = (expenses || []).reduce((s, e) => s + (Number(e.totalAmount) || 0), 0);

    const totalOpsCost = hotelCost + transportCost + guideCost + miscCost + detailedExpensesCost;

    let travelerCount = (bookings || []).reduce((s, b) => s + (Number(b.numberOfTravelers) || 1), 0);
    if (travelerCount === 0) travelerCount = 1;

    const perPersonOpsCost = totalOpsCost / travelerCount;

    // Fetch accounting entries and ticket requests for readiness summaries
    const bookingIds = (bookings || []).map(b => b.bookingId).filter(Boolean);
    let allAccounting = [];
    let ticketRequests = [];
    if (bookingIds.length > 0) {
      try {
        [allAccounting, ticketRequests] = await Promise.all([
          prisma.accountingEntry.findMany({ where: { bookingId: { in: bookingIds } } }).catch(() => []),
          prisma.trainTicketRequest.findMany({ where: { bookingId: { in: bookingIds } } }).catch(() => [])
        ]);
      } catch (e) {
        console.error('Accounting/Ticket sub-query warning:', e);
      }
    }

    const approvedAccounting = (allAccounting || []).filter(a => a && a.status === 'APPROVED');
    const totalRevenueCollected = approvedAccounting.reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const profitPerTrip = totalRevenueCollected - totalOpsCost;

    const ticketReadiness = {
      pending: (ticketRequests || []).filter(t => t && (t.status === 'PENDING_VERIFICATION' || t.status === 'DRAFT')).length,
      approved: (ticketRequests || []).filter(t => t && t.status === 'APPROVED').length,
      cancelled: (ticketRequests || []).filter(t => t && t.status === 'CANCELLED').length
    };

    const pendingCollection = (allAccounting || []).filter(a => a && a.status === 'PENDING').reduce((s, a) => s + (Number(a.amount) || 0), 0);
    const totalBookingAmount = (bookings || []).reduce((s, b) => s + (Number(b.totalAmount) || Number(b.amount) || 0), 0);
    const remainingCollection = Math.max(0, totalBookingAmount - totalRevenueCollected);

    const accountingReadiness = {
      approvedCollected: totalRevenueCollected,
      pendingCollection,
      remainingCollection,
      totalBookingAmount
    };

    return res.json({
      success: true,
      data: withProfitFields(
        req.user || req.admin,
        {
          hotelCost,
          transportCost,
          guideCost,
          miscCost,
          detailedExpensesCost,
          totalOpsCost,
          travelerCount,
          perPersonOpsCost,
          totalRevenueCollected,
          ticketReadiness,
          accountingReadiness
        },
        { profitPerTrip },
      )
    });
  } catch (err) {
    console.error('getOpsAccountingSummary fatal error:', err);
    return res.json({
      success: true,
      data: withProfitFields(
        req.user || req.admin,
        {
          hotelCost: 0, transportCost: 0, guideCost: 0, miscCost: 0, detailedExpensesCost: 0,
          totalOpsCost: 0, travelerCount: 1, perPersonOpsCost: 0, totalRevenueCollected: 0,
          ticketReadiness: { pending: 0, approved: 0, cancelled: 0 },
          accountingReadiness: { approvedCollected: 0, pendingCollection: 0, remainingCollection: 0, totalBookingAmount: 0 }
        },
        { profitPerTrip: 0 },
      )
    });
  }
};

// ── SEAT MANAGEMENT (DEPARTURE SCOPED) ──
// Lightweight, read-only departure overview. Detailed rows remain behind their
// respective tabs and accounting/profit reports remain behind the accounting tab.
exports.getWorkspaceSummary = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    const cacheKey = `ops_summary_${ctx.tripId}_${ctx.departureDate || 'all'}`;
    const cached = opsSummaryCache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return res.json({ success: true, data: cached.data });
    }

    const [bookingAggregate, bookingRefs, seatConfig, checklistCounts, openIncidentCount, leaders,
      hotelCounts, transportCount, roomAllocationCount, vehicleAllocationCount, latestAllocation] = await Promise.all([
        prisma.booking.aggregate({
          where: ctx.bookingWhere,
          _sum: { numberOfTravelers: true, totalAmount: true }
        }).catch(e => ({ _sum: { numberOfTravelers: 0, totalAmount: 0 } })),
        prisma.booking.findMany({ where: ctx.bookingWhere, select: { bookingId: true } }).catch(e => []),
        prisma.opsSeatConfig.findFirst({
          where: ctx.where,
          select: { id: true, totalSeatsCap: true, alertThreshold: true, blockedSeats: true }
        }).catch(e => null),
        prisma.opsTripChecklist.groupBy({
          by: ['isCompleted'], where: ctx.where, _count: { _all: true }
        }).catch(e => []),
        prisma.opsIncidentLog.count({ where: { ...ctx.where, status: 'OPEN' } }).catch(e => 0),
        prisma.opsTripLeader.findMany({
          where: { ...ctx.where, archivedAt: null },
          select: { id: true, leaderName: true, leaderPhone: true, leaderType: true, isPrimary: true },
          orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
          take: 10
        }).catch(e => []),
        prisma.opsHotelBooking.groupBy({
          by: ['confirmed'], where: ctx.where, _count: { _all: true }
        }).catch(e => []),
        prisma.opsTransportFleet.count({ where: ctx.where }).catch(e => 0),
        prisma.opsRoomAllocation.count({ where: { tripId: ctx.tripId, departureDate: ctx.departureDate } }).catch(e => 0),
        prisma.opsVehicleAllocation.count({ where: { tripId: ctx.tripId, departureDate: ctx.departureDate } }).catch(e => 0),
        prisma.opsAllocationRun.findFirst({
          where: ctx.where,
          select: { status: true, version: true },
          orderBy: { createdAt: 'desc' }
        }).catch(e => null)
      ]);

    const bookingIds = (bookingRefs || []).map((booking) => booking.bookingId).filter(Boolean);
    const [ticketCounts, accountingTotals] = bookingIds.length > 0
      ? await Promise.all([
        prisma.trainTicketRequest.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId, bookingId: { in: bookingIds } },
          _count: { _all: true }
        }).catch(e => []),
        prisma.accountingEntry.groupBy({
          by: ['status'],
          where: { tenantId: ctx.tenantId, bookingId: { in: bookingIds } },
          _sum: { amount: true }
        }).catch(e => [])
      ])
      : [[], []];

    const travelerCount = bookingAggregate?._sum?.numberOfTravelers || 0;
    const totalBookingAmount = bookingAggregate?._sum?.totalAmount || 0;
    const totalSeatsCap = seatConfig?.totalSeatsCap ?? 30;
    const blockedSeats = seatConfig?.blockedSeats ?? 0;
    const ticketsByStatus = Object.fromEntries((ticketCounts || []).map((row) => [row.status, row._count._all]));
    const accountingByStatus = Object.fromEntries((accountingTotals || []).map((row) => [row.status, row._sum?.amount || 0]));
    const checklistByStatus = Object.fromEntries((checklistCounts || []).map((row) => [String(row.isCompleted), row._count._all]));
    const hotelByStatus = Object.fromEntries((hotelCounts || []).map((row) => [row.confirmed, row._count._all]));
    const approvedCollections = accountingByStatus.APPROVED || 0;

    const resData = {
      acceptedTravelerCount: travelerCount,
      ticketReadiness: {
        approved: ticketsByStatus.APPROVED || 0,
        pending: (ticketsByStatus.PENDING_VERIFICATION || 0) + (ticketsByStatus.DRAFT || 0),
        cancelled: ticketsByStatus.CANCELLED || 0
      },
      approvedCollections,
      pendingCollections: accountingByStatus.PENDING || 0,
      remainingCollections: Math.max(0, totalBookingAmount - approvedCollections),
      seatAvailability: {
        configured: Boolean(seatConfig),
        totalSeatsCap,
        alertThreshold: seatConfig?.alertThreshold ?? 25,
        blockedSeats,
        seatsSold: travelerCount,
        seatsAvailable: Math.max(0, totalSeatsCap - travelerCount - blockedSeats),
        waitingList: Math.max(0, travelerCount + blockedSeats - totalSeatsCap)
      },
      hotelTransportStatus: {
        hotelsTotal: (hotelCounts || []).reduce((sum, row) => sum + (row._count?._all || 0), 0),
        hotelsConfirmed: hotelByStatus.CONFIRMED || 0,
        transportTotal: transportCount || 0
      },
      allocationState: {
        status: latestAllocation?.status || 'NOT_STARTED',
        version: latestAllocation?.version || 0,
        roomAllocations: roomAllocationCount || 0,
        vehicleAllocations: vehicleAllocationCount || 0
      },
      checklistCompletion: {
        completed: checklistByStatus.true || 0,
        total: (checklistByStatus.true || 0) + (checklistByStatus.false || 0)
      },
      blockingFlagCount: openIncidentCount || 0,
      openIncidentCount: openIncidentCount || 0,
      leaders: leaders || []
    };

    opsSummaryCache.set(cacheKey, { data: resData, expiresAt: Date.now() + 60000 });
    return res.json({ success: true, data: resData });
  } catch (err) {
    console.error('getWorkspaceSummary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch operations summary' });
  }
};

exports.getSeatConfig = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    let config = await prisma.opsSeatConfig.findFirst({
      where: { tenantId: ctx.tenantId, tripId: ctx.tripId, departureDate: ctx.departureDate }
    });

    if (!config) {
      config = await prisma.opsSeatConfig.create({
        data: { tenantId: ctx.tenantId, tripId: ctx.tripId, departureDate: ctx.departureDate, totalSeatsCap: 30, alertThreshold: 25 }
      });
    }

    const bookingWhere = ctx.bookingWhere;
    const bookings = await prisma.booking.findMany({ where: bookingWhere });
    const seatsSold = bookings.reduce((s, b) => s + (b.numberOfTravelers || 1), 0);
    const seatsAvailable = Math.max(0, config.totalSeatsCap - seatsSold - config.blockedSeats);
    const waitingList = seatsSold > config.totalSeatsCap ? seatsSold - config.totalSeatsCap : 0;

    return res.json({
      success: true,
      data: {
        ...config,
        seatsSold,
        seatsAvailable,
        waitingList
      }
    });
  } catch (err) {
    console.error('getSeatConfig error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch seat config' });
  }
};

// ── TRIP CHECKLIST & INCIDENTS ──
exports.getChecklist = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to checklist logs' });
    }

    const items = await prisma.opsTripChecklist.findMany({
      where: ctx.where,
      include: {
        completedBy: { select: { id: true, name: true } },
        activities: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { taskName: 'asc' }
    });

    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getChecklist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch checklist' });
  }
};

exports.initializeChecklist = async (req, res) => {
  try {
    const { tripId: rawTripId } = req.params;
    const rawDate = req.query.departureDate || req.body.departureDate;

    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to initialize checklists' });
    }

    // 1. Confirm the related trip exists
    const trip = await prisma.trip.findFirst({
      where: { id: ctx.tripId }
    });
    if (!trip) {
      console.error("Trip not found during checklist initialization", { tripId: ctx.tripId });
      return res.status(404).json({
        success: false,
        code: 'TRIP_NOT_FOUND',
        message: 'Related trip not found.'
      });
    }

    // 2. Validate the departure exists (using availableDates or bookings fallback)
    const formattedDate = ctx.departureDate.toISOString().substring(0, 10);
    let datesList = [];
    if (trip.availableDates) {
      try {
        datesList = typeof trip.availableDates === 'string'
          ? JSON.parse(trip.availableDates)
          : trip.availableDates;
      } catch (e) {
        datesList = [];
      }
    }
    const departureExistsInDates = Array.isArray(datesList) && datesList.some((d) => {
      const dStr = typeof d === 'string' ? d : d.date || d.departureDate;
      return dStr && dStr.substring(0, 10) === formattedDate;
    });

    if (!departureExistsInDates) {
      const bookingsCount = await prisma.booking.count({
        where: {
          tripId: ctx.tripId,
          departureDate: {
            gte: new Date(formattedDate + 'T00:00:00.000Z'),
            lte: new Date(formattedDate + 'T23:59:59.999Z')
          }
        }
      });
      if (bookingsCount === 0) {
        console.error("Departure not found during checklist initialization", { tripId: ctx.tripId, departureDate: formattedDate });
        return res.status(404).json({
          success: false,
          code: 'DEPARTURE_NOT_FOUND',
          message: `No departure was found for code ${rawTripId} and date ${formattedDate}.`
        });
      }
    }

    // 3. Confirm itinerary is present
    if (!trip.itinerary || !Array.isArray(trip.itinerary) || trip.itinerary.length === 0) {
      console.error("Trip itinerary is missing during checklist initialization", { tripId: ctx.tripId });
      return res.status(422).json({
        success: false,
        code: 'ITINERARY_MISSING',
        message: 'Trip itinerary is missing.'
      });
    }

    const destination = trip.destination || trip.title || '';

    // Fetch active SOP templates for this destination
    const templates = await prisma.opsSOPTemplate.findMany({
      where: {
        tenantId: ctx.tenantId,
        destination: { contains: destination, mode: 'insensitive' }
      }
    });

    const defaults = [
      { stage: 'PRE_TRIP_30D', tasks: ['Hotel booking confirmed', 'Train tickets reviewed', 'Guide confirmed', 'WhatsApp group created'] },
      { stage: 'PRE_TRIP_7D', tasks: ['Packing list sent', 'SIM/mobile advisory sent', 'Emergency contact collected'] },
      { stage: 'PRE_TRIP_1D', tasks: ['Vehicle reconfirmed', 'Hotel reconfirmed', 'Trip leader briefed'] },
      { stage: 'DEPARTURE_DAY', tasks: ['Headcount completed', 'Documents checked', 'Group photo completed'] },
      { stage: 'DURING_TRIP', tasks: ['Daily check-in logged', 'Incident review completed'] },
      { stage: 'POST_TRIP', tasks: ['Feedback form sent', 'Photos collected', 'Next-trip follow-up created'] }
    ];

    const tasksToCreate = [];
    if (templates.length > 0) {
      templates.forEach(tpl => {
        tasksToCreate.push({
          stage: tpl.stage,
          taskName: tpl.taskName
        });
      });
    } else {
      defaults.forEach(dGroup => {
        dGroup.tasks.forEach(tName => {
          tasksToCreate.push({
            stage: dGroup.stage,
            taskName: tName
          });
        });
      });
    }

    // Idempotent creation: get existing tasks
    const existing = await prisma.opsTripChecklist.findMany({
      where: ctx.where,
      select: { stage: true, taskName: true }
    });

    const seedData = [];
    tasksToCreate.forEach(task => {
      const alreadyExists = existing.some(e => e.stage === task.stage && e.taskName === task.taskName);
      if (!alreadyExists) {
        seedData.push({
          tenantId: ctx.tenantId,
          tripId: ctx.tripId,
          departureDate: ctx.departureDate,
          stage: task.stage,
          taskName: task.taskName,
          isCompleted: false
        });
      }
    });

    if (seedData.length > 0) {
      await prisma.opsTripChecklist.createMany({ data: seedData });
    }

    const items = await prisma.opsTripChecklist.findMany({
      where: ctx.where,
      include: {
        completedBy: { select: { id: true, name: true } },
        activities: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { taskName: 'asc' }
    });

    if (existing.length > 0 && seedData.length === 0) {
      return res.json({
        success: true,
        created: 0,
        existing: existing.length,
        message: "Checklist was already initialized.",
        data: items
      });
    }

    return res.json({
      success: true,
      created: seedData.length,
      existing: existing.length,
      message: 'Checklist initialized successfully',
      data: items
    });
  } catch (err) {
    console.error('initializeChecklist error:', err);
    return res.status(500).json({ success: false, message: 'Failed to initialize checklist' });
  }
};

exports.completeChecklistItem = async (req, res) => {
  try {
    const { id, notes } = req.body;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to checklist items' });
    }
    const item = await prisma.opsTripChecklist.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });

    if (item.isCompleted) {
      return res.status(400).json({ success: false, message: 'Checklist item is already completed' });
    }

    const updated = await prisma.opsTripChecklist.update({
      where: { id },
      data: {
        isCompleted: true,
        completedById: req.user.id,
        completedAt: new Date(),
        notes: notes || item.notes
      }
    });

    await prisma.opsChecklistActivity.create({
      data: {
        tenantId: item.tenantId,
        checklistItemId: item.id,
        action: 'COMPLETE',
        previousStatus: false,
        nextStatus: true,
        notes: notes || null,
        actorId: req.user.id
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('completeChecklistItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to complete checklist item' });
  }
};

exports.reopenChecklistItem = async (req, res) => {
  try {
    const { id, notes } = req.body;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to checklist items' });
    }
    const item = await prisma.opsTripChecklist.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'Checklist item not found' });

    if (!item.isCompleted) {
      return res.status(400).json({ success: false, message: 'Checklist item is already open' });
    }

    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Reopening a checklist item requires an explicit reason (notes)' });
    }

    const updated = await prisma.opsTripChecklist.update({
      where: { id },
      data: {
        isCompleted: false,
        completedById: null,
        completedAt: null,
        notes: notes
      }
    });

    await prisma.opsChecklistActivity.create({
      data: {
        tenantId: item.tenantId,
        checklistItemId: item.id,
        action: 'REOPEN',
        previousStatus: true,
        nextStatus: false,
        notes: notes,
        actorId: req.user.id
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('reopenChecklistItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reopen checklist item' });
  }
};

exports.createChecklistItem = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const { taskName, stage, notes } = req.body;
    if (!taskName || !stage) {
      return res.status(400).json({ success: false, message: 'taskName and stage are required' });
    }
    const item = await prisma.opsTripChecklist.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        stage,
        taskName,
        notes: notes || null,
        isCompleted: false
      }
    });
    return res.json({ success: true, data: item });
  } catch (err) {
    console.error('createChecklistItem error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create checklist item' });
  }
};

exports.getIncidents = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to incident logs' });
    }

    const incidents = await prisma.opsIncidentLog.findMany({
      where: ctx.where,
      include: {
        reportedBy: { select: { id: true, name: true } },
        resolvedBy: { select: { id: true, name: true } },
        activities: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: incidents });
  } catch (err) {
    console.error('getIncidents error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch incidents' });
  }
};

exports.createIncident = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to create incident logs' });
    }

    const { title, severity, description, incidentType } = req.body;
    const VALID_INCIDENT_TYPES = ['MEDICAL', 'LOST_LUGGAGE', 'HOTEL_ISSUE', 'TRANSPORT_ISSUE', 'GUEST_CONFLICT', 'DOCUMENT_ISSUE', 'OTHER'];
    if (incidentType && !VALID_INCIDENT_TYPES.includes(incidentType)) {
      return res.status(400).json({ success: false, message: 'Invalid incidentType value' });
    }

    const incident = await prisma.opsIncidentLog.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        title,
        severity: severity || 'MEDIUM',
        description,
        incidentType: incidentType || 'OTHER',
        status: 'OPEN',
        reportedById: req.user.id
      }
    });

    await prisma.opsIncidentActivity.create({
      data: {
        tenantId: ctx.tenantId,
        incidentId: incident.id,
        action: 'CREATE',
        notes: description,
        actorId: req.user.id
      }
    });

    return res.status(201).json({ success: true, data: incident });
  } catch (err) {
    console.error('createIncident error:', err);
    return res.status(500).json({ success: false, message: 'Failed to log incident' });
  }
};

exports.resolveIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolution } = req.body;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to resolve incidents' });
    }

    const incident = await prisma.opsIncidentLog.findUnique({ where: { id } });
    if (!incident) return res.status(404).json({ success: false, message: 'Incident log not found' });

    const updated = await prisma.opsIncidentLog.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        resolution: resolution || incident.resolution,
        resolvedById: req.user.id,
        resolvedAt: new Date()
      }
    });

    await prisma.opsIncidentActivity.create({
      data: {
        tenantId: incident.tenantId,
        incidentId: incident.id,
        action: 'RESOLVE',
        notes: resolution || null,
        actorId: req.user.id
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('resolveIncident error:', err);
    return res.status(500).json({ success: false, message: 'Failed to resolve incident' });
  }
};

exports.reopenIncident = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to reopen incidents' });
    }

    if (!notes || !notes.trim()) {
      return res.status(400).json({ success: false, message: 'Reopening an incident requires a reason (notes)' });
    }

    const incident = await prisma.opsIncidentLog.findUnique({ where: { id } });
    if (!incident) return res.status(404).json({ success: false, message: 'Incident log not found' });

    const updated = await prisma.opsIncidentLog.update({
      where: { id },
      data: {
        status: 'OPEN',
        resolvedById: null,
        resolvedAt: null
      }
    });

    await prisma.opsIncidentActivity.create({
      data: {
        tenantId: incident.tenantId,
        incidentId: incident.id,
        action: 'REOPEN',
        notes: notes.trim(),
        actorId: req.user.id
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('reopenIncident error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reopen incident' });
  }
};

// ── ROOM INVENTORY (Available rooms for allocation) ──
exports.getRoomInventory = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;
    const items = await prisma.opsRoomInventory.findMany({ where: ctx.where, orderBy: { roomLabel: 'asc' } });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getRoomInventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch room inventory' });
  }
};

exports.createRoomInventory = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to modify room inventory' });
    }

    const { roomLabel, roomType, genderGroup, capacity, hotelName, notes, quantity } = req.body;
    if (!roomLabel || !roomType || !capacity) {
      return res.status(400).json({ success: false, message: 'roomLabel, roomType, and capacity are required' });
    }

    const qty = quantity ? parseInt(quantity) : 1;
    const createdRooms = [];

    // Parse starting room number if any
    const labelMatch = roomLabel.match(/^(.*?)(\d+)$/);
    if (qty > 1 && labelMatch) {
      const prefix = labelMatch[1];
      const startNum = parseInt(labelMatch[2]);
      const totalDigits = labelMatch[2].length;

      for (let i = 0; i < qty; i++) {
        const currentNum = startNum + i;
        const currentLabel = `${prefix}${String(currentNum).padStart(totalDigits, '0')}`;
        const newRoom = await prisma.opsRoomInventory.create({
          data: {
            tenantId: ctx.tenantId,
            tripId: ctx.tripId,
            departureDate: ctx.departureDate,
            roomLabel: currentLabel,
            roomType,
            genderGroup: genderGroup || 'GROUP',
            capacity: parseInt(capacity),
            hotelName,
            notes
          }
        });
        createdRooms.push(newRoom);
      }
    } else {
      const newRoom = await prisma.opsRoomInventory.create({
        data: {
          tenantId: ctx.tenantId,
          tripId: ctx.tripId,
          departureDate: ctx.departureDate,
          roomLabel,
          roomType,
          genderGroup: genderGroup || 'GROUP',
          capacity: parseInt(capacity),
          hotelName,
          notes
        }
      });
      createdRooms.push(newRoom);
    }

    return res.status(201).json({ success: true, data: qty > 1 ? createdRooms : createdRooms[0] });
  } catch (err) {
    console.error('createRoomInventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create room inventory' });
  }
};

exports.deleteRoomInventory = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to delete room inventory' });
    }

    await prisma.opsRoomInventory.delete({ where: { id } });
    return res.json({ success: true, message: 'Room inventory deleted successfully' });
  } catch (err) {
    console.error('deleteRoomInventory error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete room inventory' });
  }
};

// ── TRAVELER SEGREGATION / AUTO-ALLOCATION ENGINE ──
exports.generateAllocation = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to run allocations' });
    }

    const bookings = await prisma.booking.findMany({
      where: ctx.bookingWhere
    });

    const fleet = await prisma.opsTransportFleet.findMany({ where: ctx.where });
    const rooms = await prisma.opsRoomInventory.findMany({ where: ctx.where });

    // Enrich bookings with tripId so allocation engine can resolve hotel priority
    const enrichedBookings = bookings.map(b => ({ ...b, tripId: ctx.tripId }));

    const result = await runAutoAllocation(enrichedBookings, fleet, rooms);

    // Get current version count to bump
    const runCount = await prisma.opsAllocationRun.count({ where: ctx.where });
    const run = await prisma.opsAllocationRun.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        version: runCount + 1,
        status: 'DRAFT',
        resultJson: result,
        actorId: req.user.id
      }
    });

    return res.json({ success: true, data: { allocationRunId: run.id, ...result } });
  } catch (err) {
    console.error('generateAllocation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate traveler allocations' });
  }
};

exports.confirmAllocation = async (req, res) => {
  try {
    const { allocationRunId, roomAllocations: reqRoomAllocs, vehicleAllocations: reqVehicleAllocs } = req.body;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to confirm allocations' });
    }

    const run = await prisma.opsAllocationRun.findUnique({ where: { id: allocationRunId } });
    if (!run) return res.status(404).json({ success: false, message: 'Allocation draft run not found' });

    await prisma.$transaction(async (tx) => {
      let finalResult = run.resultJson;
      if (reqRoomAllocs || reqVehicleAllocs) {
        finalResult = {
          ...run.resultJson,
          roomAllocations: reqRoomAllocs || [],
          vehicleAllocations: reqVehicleAllocs || []
        };
      }

      // Mark run as CONFIRMED
      await tx.opsAllocationRun.update({
        where: { id: run.id },
        data: {
          status: 'CONFIRMED',
          actorId: req.user.id,
          resultJson: finalResult
        }
      });

      // Clear existing confirmed allocations for this specific departure date
      const scope = { tripId: run.tripId, departureDate: run.departureDate };
      await tx.opsVehicleAllocation.deleteMany({ where: scope });
      await tx.opsRoomAllocation.deleteMany({ where: scope });

      // Save confirmed results to vehicle allocations
      const result = run.resultJson;
      const vehicleAllocations = [];
      const roomAllocations = [];

      if (reqVehicleAllocs && reqVehicleAllocs.length > 0) {
        reqVehicleAllocs.forEach(v => {
          vehicleAllocations.push({
            tripId: run.tripId,
            departureDate: run.departureDate,
            fleetId: v.fleetId || v.vehicleId,
            bookingId: v.bookingId,
            travelerName: v.travelerName,
            seatNumber: v.seatNumber || null
          });
        });
      } else if (result.vehicles) {
        result.vehicles.forEach(v => {
          v.assignedTravelers.forEach(t => {
            vehicleAllocations.push({
              tripId: run.tripId,
              departureDate: run.departureDate,
              fleetId: v.fleetId,
              bookingId: t.bookingId,
              travelerName: t.name,
              seatNumber: t.seatNumber || null
            });
          });
        });
      }

      if (reqRoomAllocs && reqRoomAllocs.length > 0) {
        reqRoomAllocs.forEach(r => {
          roomAllocations.push({
            tripId: run.tripId,
            departureDate: run.departureDate,
            roomNumber: r.roomNumber || r.roomLabel,
            roomType: r.roomType,
            genderGroup: r.genderGroup,
            bookingId: bookingMap.get(r.bookingId),
            travelerName: r.travelerName
          });
        });
      } else if (result.rooms) {
        result.rooms.forEach(r => {
          r.assignedTravelers.forEach(t => {
            roomAllocations.push({
              tripId: run.tripId,
              departureDate: run.departureDate,
              roomNumber: r.roomLabel,
              roomType: r.roomType,
              genderGroup: r.genderGroup,
              bookingId: t.bookingId,
              travelerName: t.name
            });
          });
        });
      }

      if (vehicleAllocations.length > 0) {
        await tx.opsVehicleAllocation.createMany({ data: vehicleAllocations });
      }
      if (roomAllocations.length > 0) {
        await tx.opsRoomAllocation.createMany({ data: roomAllocations });
      }
    });

    return res.json({ success: true, message: 'Allocation successfully locked and confirmed' });
  } catch (err) {
    console.error('confirmAllocation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to lock allocation run' });
  }
};

exports.getConfirmedAllocations = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    // Build date range for robust @db.Date field querying
    const startOfAllocDay = new Date(ctx.departureDate);
    startOfAllocDay.setUTCHours(0, 0, 0, 0);
    const endOfAllocDay = new Date(ctx.departureDate);
    endOfAllocDay.setUTCHours(23, 59, 59, 999);
    const allocDateRange = { gte: startOfAllocDay, lte: endOfAllocDay };

    const possibleTripIds = Array.from(
      new Set(
        [ctx.tripId, req.params.tripId, req.params.tripId?.toUpperCase?.(), req.params.tripId?.toLowerCase?.()].filter(
          Boolean,
        ),
      ),
    );

    // Only return ACTIVE allocations (not CANCELLED soft-deletes)
    const rooms = await prisma.opsRoomAllocation.findMany({
      where: {
        tripId: { in: possibleTripIds },
        departureDate: allocDateRange,
        allocationStatus: 'ACTIVE',
      },
      orderBy: { roomNumber: 'asc' },
    });

    const vehicles = await prisma.opsVehicleAllocation.findMany({
      where: {
        tripId: { in: possibleTripIds },
        departureDate: allocDateRange,
        allocationStatus: 'ACTIVE',
      },
      include: {
        fleet: { select: { id: true, driverName: true, vehicleType: true, capacity: true } },
      },
      orderBy: [{ fleetId: 'asc' }, { seatNumber: 'asc' }],
    });

    // Compute allocation summary
    const fleetCapacities = {};
    if (vehicles.length > 0) {
      const fleetIds = [...new Set(vehicles.map((v) => v.fleetId))];
      const fleets = await prisma.opsTransportFleet.findMany({
        where: { id: { in: fleetIds } },
        select: { id: true, capacity: true, vehicleType: true },
      });
      fleets.forEach((f) => {
        fleetCapacities[f.id] = { capacity: f.capacity, type: f.vehicleType };
      });
    }

    const vehicleGroups = {};
    vehicles.forEach((v) => {
      if (!vehicleGroups[v.fleetId]) {
        vehicleGroups[v.fleetId] = { ...fleetCapacities[v.fleetId], assigned: 0 };
      }
      vehicleGroups[v.fleetId].assigned++;
    });

    return res.json({
      success: true,
      data: {
        rooms,
        vehicles,
        summary: {
          totalRoomAllocations: rooms.length,
          totalVehicleAllocations: vehicles.length,
          vehicleCapacitySummary: Object.entries(vehicleGroups).map(([id, g]) => ({
            fleetId: id,
            type: g.type,
            capacity: g.capacity || 0,
            assigned: g.assigned,
            remaining: (g.capacity || 0) - g.assigned,
          })),
        },
      },
    });
  } catch (err) {
    console.error('getConfirmedAllocations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch confirmed allocations' });
  }
};

exports.overrideAllocation = async (req, res) => {
  try {
    const { allocationRunId, targetType, targetId, afterValue, reason } = req.body;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to override allocations' });
    }

    const run = await prisma.opsAllocationRun.findUnique({ where: { id: allocationRunId } });
    if (!run) return res.status(404).json({ success: false, message: 'Allocation run not found' });

    // Store manual override record
    const override = await prisma.opsAllocationOverride.create({
      data: {
        tenantId: run.tenantId,
        allocationRunId: run.id,
        targetType,
        targetId,
        beforeValue: null,
        afterValue,
        reason,
        actorId: req.user.id
      }
    });

    return res.json({ success: true, data: override });
  } catch (err) {
    console.error('overrideAllocation error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record manual override' });
  }
};
// ── MANUAL ALLOCATION SAVE (hardened: validated, transactional, audited) ──
exports.saveManualAllocations = async (req, res) => {
  try {
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role cannot save allocations' });
    }

    const {
      tripId,
      departureDate: rawDate,
      roomAllocations: rawRoomAllocations = [],
      vehicleAllocations: rawVehicleAllocations = [],
      clearExisting = false,
      target = 'all',
    } = req.body;

    // Mutable working copies so we can normalize bookingId references before FK-constrained upserts
    let roomAllocations = [...rawRoomAllocations];
    let vehicleAllocations = [...rawVehicleAllocations];

    if (!tripId || !rawDate) {
      return res.status(400).json({ success: false, message: 'tripId and departureDate are required' });
    }

    // Require explicit clearExisting flag when sending empty arrays for the target
    const isEmpty =
      target === 'rooms'
        ? roomAllocations.length === 0
        : target === 'vehicles'
          ? vehicleAllocations.length === 0
          : roomAllocations.length === 0 && vehicleAllocations.length === 0;

    if (isEmpty && !clearExisting) {
      return res.status(400).json({
        success: false,
        message: 'Sending empty allocation arrays requires clearExisting=true to prevent accidental data loss',
      });
    }

    const tenantId = req.user?.tenantId || 'default';
    const departureDate = normalizeDepartureDateIndia(rawDate);
    if (!departureDate || isNaN(departureDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid departureDate format' });
    }

    // Resolve trip
    const trip = await prisma.trip.findFirst({
      where: {
        OR: [
          { id: tripId },
          { slug: tripId },
          { shortName: tripId },
          { title: { contains: tripId, mode: 'insensitive' } },
        ],
      },
      select: { id: true, slug: true, shortName: true },
    });
    if (!trip) return res.status(404).json({ success: false, message: `Trip not found: ${tripId}` });
    const resolvedTripId = trip.id;

    // ── PRE-VALIDATION (all checks before any DB write) ──

    // 1. Validate all bookingIds belong to this departure
    const allBookingIds = [
      ...roomAllocations.map((r) => r.bookingId),
      ...vehicleAllocations.map((v) => v.bookingId),
    ].filter(Boolean);

    const tripIdCandidates = [tripId, resolvedTripId, trip.slug, trip.shortName].filter(Boolean);

    const [tripBookings, referencedBookings] = await Promise.all([
      prisma.booking.findMany({
        where: { tripId: { in: tripIdCandidates } },
        select: {
          id: true,
          bookingId: true,
          name: true,
          fullName: true,
          departureDate: true,
        },
      }),
      allBookingIds.length > 0
        ? prisma.booking.findMany({
            where: {
              OR: [{ id: { in: allBookingIds } }, { bookingId: { in: allBookingIds } }],
            },
            select: {
              id: true,
              bookingId: true,
              name: true,
              fullName: true,
              departureDate: true,
            },
          })
        : Promise.resolve([]),
    ]);

    const bookingMap = new Map();
    [...tripBookings, ...referencedBookings].forEach((b) => {
      bookingMap.set(b.id, b);
      if (b.bookingId) bookingMap.set(b.bookingId, b);
    });

    const validBookings = [...bookingMap.values()].filter((b) => {
      const bookingDay = normalizeDepartureDateIndia(b.departureDate);
      return bookingDay && bookingDay.getTime() === departureDate.getTime();
    });

    const idToBookingId = {};
    const nameToBookingId = {};
    validBookings.forEach((b) => {
      if (b.id) idToBookingId[b.id] = b.bookingId;
      if (b.bookingId) idToBookingId[b.bookingId] = b.bookingId;
      if (b.name) nameToBookingId[b.name.trim().toLowerCase()] = b.bookingId;
      if (b.fullName) nameToBookingId[b.fullName.trim().toLowerCase()] = b.bookingId;
    });
    const defaultBookingId =
      validBookings[0]?.bookingId ||
      (allBookingIds[0] ? idToBookingId[allBookingIds[0]] || allBookingIds[0] : null);

    if ((roomAllocations.length > 0 || vehicleAllocations.length > 0) && !defaultBookingId) {
      return res.status(400).json({
        success: false,
        message:
          'No bookings found for this departure date. Passengers cannot be allocated until bookings match the departure.',
      });
    }

    // Normalize all allocation bookingId fields to use the FK-compatible bookingId display string
    roomAllocations = roomAllocations.map((r) => {
      const bKey = r.travelerName ? nameToBookingId[r.travelerName.trim().toLowerCase()] : null;
      return {
        ...r,
        bookingId: idToBookingId[r.bookingId] || bKey || defaultBookingId,
      };
    });
    vehicleAllocations = vehicleAllocations.map((v) => {
      const bKey = v.travelerName ? nameToBookingId[v.travelerName.trim().toLowerCase()] : null;
      return {
        ...v,
        bookingId: idToBookingId[v.bookingId] || bKey || defaultBookingId,
      };
    });

    // 2. Validate all fleetIds belong to this departure, or auto-create/map if needed
    let defaultFleet = null;
    if (vehicleAllocations.length > 0 && (target === 'all' || target === 'vehicles')) {
      const fleetDayStart = new Date(departureDate);
      fleetDayStart.setUTCHours(0, 0, 0, 0);
      const fleetDayEnd = new Date(departureDate);
      fleetDayEnd.setUTCHours(23, 59, 59, 999);
      let validFleets = await prisma.opsTransportFleet.findMany({
        where: {
          tripId: { in: [tripId, resolvedTripId] },
          departureDate: { gte: fleetDayStart, lte: fleetDayEnd },
        },
        select: { id: true, capacity: true, driverName: true, vehicleType: true },
      });

      const distinctInputFleetIds = [
        ...new Set(vehicleAllocations.map((v) => v.fleetId).filter(Boolean)),
      ];

      // Auto-create fleet records if none exist for this departure
      if (validFleets.length === 0) {
        for (let i = 0; i < Math.max(1, distinctInputFleetIds.length); i++) {
          const fleetNumber = i + 1;
          const createdFleet = await prisma.opsTransportFleet.create({
            data: {
              tripId: resolvedTripId,
              departureDate,
              vehicleType: '17 Seater Tempo Traveller',
              capacity: 17,
              totalAmount: 0,
              driverName: `Tempo ${fleetNumber}`,
              notes: `Auto-created departure fleet ${fleetNumber}`,
            },
            select: { id: true, capacity: true, driverName: true, vehicleType: true },
          });
          validFleets.push(createdFleet);
        }
      }

      // If more fleets were requested than exist in DB, auto-create
      while (validFleets.length < distinctInputFleetIds.length) {
        const nextIdx = validFleets.length + 1;
        const createdFleet = await prisma.opsTransportFleet.create({
          data: {
            tripId: resolvedTripId,
            departureDate,
            vehicleType: '17 Seater Tempo Traveller',
            capacity: 17,
            totalAmount: 0,
            driverName: `Tempo ${nextIdx}`,
            notes: `Auto-created departure fleet ${nextIdx}`,
          },
          select: { id: true, capacity: true, driverName: true, vehicleType: true },
        });
        validFleets.push(createdFleet);
      }

      const validFleetMap = new Map(validFleets.map((f) => [f.id, f]));
      defaultFleet = validFleets[0];

      // Map synthetic fleet IDs (tempo-1, tempo-2, Tempo 1, etc.) to database fleet IDs
      const inputToDbFleetMap = new Map();
      distinctInputFleetIds.forEach((inId, idx) => {
        if (validFleetMap.has(inId)) {
          inputToDbFleetMap.set(inId, inId);
        } else if (/tempo[ -]?(\d+)/i.test(inId)) {
          const match = inId.match(/tempo[ -]?(\d+)/i);
          const tempoNum = parseInt(match[1], 10);
          const mappedFleet = validFleets[tempoNum - 1] || validFleets[idx] || defaultFleet;
          inputToDbFleetMap.set(inId, mappedFleet.id);
        } else {
          const mappedFleet = validFleets[idx] || defaultFleet;
          inputToDbFleetMap.set(inId, mappedFleet.id);
        }
      });

      vehicleAllocations = vehicleAllocations.map((v) => {
        const mappedFleetId =
          inputToDbFleetMap.get(v.fleetId) ||
          (validFleetMap.has(v.fleetId) ? v.fleetId : defaultFleet.id);
        return {
          ...v,
          fleetId: mappedFleetId,
        };
      });
    }

    // 4. Sanitize and deduplicate allocations safely
    const sanitizedRooms = [];
    const roomSeen = new Set();
    for (const r of roomAllocations) {
      if (!r || !r.travelerName || !r.roomNumber) continue;
      const bId = r.bookingId || defaultBookingId;
      const key = `${bId}:${r.travelerName.trim().toLowerCase()}`;
      if (roomSeen.has(key)) continue;
      roomSeen.add(key);
      sanitizedRooms.push({ ...r, bookingId: bId });
    }
    roomAllocations = sanitizedRooms;

    const sanitizedVehicles = [];
    const vehicleSeen = new Set();
    for (const v of vehicleAllocations) {
      if (!v || !v.travelerName) continue;
      const bId = v.bookingId || defaultBookingId;
      const fId = v.fleetId || defaultFleet?.id || 'tempo-1';
      const key = `${bId}:${v.travelerName.trim().toLowerCase()}`;
      if (vehicleSeen.has(key)) continue;
      vehicleSeen.add(key);
      sanitizedVehicles.push({ ...v, bookingId: bId, fleetId: fId });
    }
    vehicleAllocations = sanitizedVehicles;

    // ── TRANSACTIONAL WRITE ──
    let savedRooms = [];
    let savedVehicles = [];

    const allocDateRange = {
      gte: new Date(new Date(departureDate).setUTCHours(0, 0, 0, 0)),
      lte: new Date(new Date(departureDate).setUTCHours(23, 59, 59, 999)),
    };

    await prisma.$transaction(async (tx) => {
      // Soft-cancel existing ACTIVE allocations ONLY for targeted type
      if (target === 'all' || target === 'rooms') {
        await tx.opsRoomAllocation.updateMany({
          where: {
            tripId: resolvedTripId,
            departureDate: allocDateRange,
            allocationStatus: 'ACTIVE',
          },
          data: { allocationStatus: 'CANCELLED' },
        });

        for (const r of roomAllocations) {
          const record = await tx.opsRoomAllocation.upsert({
            where: {
              tripId_departureDate_bookingId_travelerName: {
                tripId: resolvedTripId,
                departureDate,
                bookingId: r.bookingId,
                travelerName: r.travelerName,
              },
            },
            update: {
              roomNumber: r.roomNumber,
              roomType: r.roomType || 'STANDARD',
              genderGroup: r.genderGroup || 'MIXED',
              sharingType: r.sharingType || 'STANDARD',
              allocationStatus: 'ACTIVE',
              hotelBookingId: r.hotelBookingId || null,
              notes: r.notes || null,
            },
            create: {
              tripId: resolvedTripId,
              departureDate,
              bookingId: r.bookingId,
              travelerName: r.travelerName,
              roomNumber: r.roomNumber,
              roomType: r.roomType || 'STANDARD',
              genderGroup: r.genderGroup || 'MIXED',
              sharingType: r.sharingType || 'STANDARD',
              allocationStatus: 'ACTIVE',
              hotelBookingId: r.hotelBookingId || null,
              notes: r.notes || null,
            },
          });
          savedRooms.push(record);
        }
      }

      if (target === 'all' || target === 'vehicles') {
        await tx.opsVehicleAllocation.updateMany({
          where: {
            tripId: resolvedTripId,
            departureDate: allocDateRange,
            allocationStatus: 'ACTIVE',
          },
          data: { allocationStatus: 'CANCELLED' },
        });

        for (const v of vehicleAllocations) {
          const record = await tx.opsVehicleAllocation.upsert({
            where: {
              tripId_departureDate_bookingId_travelerName: {
                tripId: resolvedTripId,
                departureDate,
                bookingId: v.bookingId,
                travelerName: v.travelerName,
              },
            },
            update: {
              fleetId: v.fleetId,
              seatNumber: v.seatNumber ? Number(v.seatNumber) : null,
              allocationStatus: 'ACTIVE',
              routeSegment: v.routeSegment || null,
              pickupPoint: v.pickupPoint || null,
            },
            create: {
              tripId: resolvedTripId,
              departureDate,
              bookingId: v.bookingId,
              travelerName: v.travelerName,
              fleetId: v.fleetId,
              seatNumber: v.seatNumber ? Number(v.seatNumber) : null,
              allocationStatus: 'ACTIVE',
              routeSegment: v.routeSegment || null,
              pickupPoint: v.pickupPoint || null,
            },
            include: {
              fleet: {
                select: { id: true, driverName: true, vehicleType: true, capacity: true },
              },
            },
          });
          savedVehicles.push(record);
        }
      }

      // Write audit record
      await tx.opsAllocationAudit.create({
        data: {
          tenantId,
          tripId: resolvedTripId,
          departureDate,
          action: isEmpty ? 'CLEAR' : 'MANUAL_SAVE',
          actorId: req.user?.id || null,
          actorName: req.user?.name || req.user?.email || null,
          roomCount: savedRooms.length,
          vehicleCount: savedVehicles.length,
          cleared: isEmpty,
          metadata: {
            requestedRooms: roomAllocations.length,
            requestedVehicles: vehicleAllocations.length,
            clearExisting,
            target,
          },
        },
      });

      // Mirror confirmed room numbers into booking JSON for legacy displays only
      if (savedRooms.length > 0) {
        const roomsByBooking = {};
        for (const r of savedRooms) {
          if (!roomsByBooking[r.bookingId]) roomsByBooking[r.bookingId] = [];
          roomsByBooking[r.bookingId].push(r);
        }
        for (const [bookingCode, allocations] of Object.entries(roomsByBooking)) {
          const booking = await tx.booking.findFirst({
            where: { bookingId: bookingCode },
            select: { id: true, passengers: true },
          });
          if (!booking) continue;
          const mirrored = mirrorConfirmedRooms(booking.passengers, allocations);
          await tx.booking.update({
            where: { id: booking.id },
            data: { passengers: mirrored },
          });
        }
      }
    });

    return res.json({
      success: true,
      message: isEmpty ? 'Allocations cleared successfully' : 'Manual allocations saved successfully',
      data: { rooms: savedRooms, vehicles: savedVehicles },
    });
  } catch (err) {
    console.error('saveManualAllocations error:', err);
    const isValidationErr = /Duplicate|Missing|capacity|not belong|not found/i.test(err.message || '');
    return res
      .status(isValidationErr ? 400 : 500)
      .json({ success: false, message: err.message || 'Failed to save manual allocations' });
  }
};


exports.getSopLibrary = async (req, res) => {
  try {
    const tenantId = req.user.tenantId || 'default';
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to SOP library' });
    }

    const { destination, includeArchived } = req.query;
    const where = { tenantId };

    if (destination) {
      where.destination = { contains: destination, mode: 'insensitive' };
    }

    // Default: return active only. Standard operations users see active only.
    // Superadmin and admins can request archived SOPs using includeArchived=true.
    const isAdminOrSuper = req.user?.role === 'admin' || req.user?.role === 'superadmin';
    if (!isAdminOrSuper || includeArchived !== 'true') {
      where.isActive = true;
    }

    const items = await prisma.opsSopLibrary.findMany({
      where,
      orderBy: { destination: 'asc' },
      include: {
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        archivedBy: { select: { id: true, name: true } }
      }
    });
    return res.json({ success: true, data: items });
  } catch (err) {
    console.error('getSopLibrary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch SOP library' });
  }
};

exports.createSopLibrary = async (req, res) => {
  try {
    const tenantId = req.user.tenantId || 'default';
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to create SOPs' });
    }

    const { destination, title, content } = req.body;
    if (!destination || !title || !content) {
      return res.status(400).json({ success: false, message: 'Destination, title and content are required' });
    }

    const item = await prisma.opsSopLibrary.create({
      data: {
        tenantId,
        destination,
        title,
        content,
        isActive: true,
        createdById: req.user.id,
        updatedById: req.user.id
      }
    });
    return res.status(201).json({ success: true, data: item });
  } catch (err) {
    console.error('createSopLibrary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create SOP library item' });
  }
};

exports.updateSopLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to edit SOPs' });
    }

    const { destination, title, content } = req.body;

    const item = await prisma.opsSopLibrary.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'SOP library item not found' });

    const updated = await prisma.opsSopLibrary.update({
      where: { id },
      data: {
        destination: destination !== undefined ? destination : item.destination,
        title: title !== undefined ? title : item.title,
        content: content !== undefined ? content : item.content,
        updatedById: req.user.id
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('updateSopLibrary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update SOP library item' });
  }
};

exports.archiveSopLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to SOP archive actions' });
    }

    const item = await prisma.opsSopLibrary.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'SOP library item not found' });

    const updated = await prisma.opsSopLibrary.update({
      where: { id },
      data: {
        isActive: false,
        archivedAt: new Date(),
        archivedById: req.user.id
      }
    });

    return res.json({ success: true, message: 'SOP library item archived successfully', data: updated });
  } catch (err) {
    console.error('archiveSopLibrary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to archive SOP library item' });
  }
};

exports.restoreSopLibrary = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to SOP restore actions' });
    }

    const item = await prisma.opsSopLibrary.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ success: false, message: 'SOP library item not found' });

    const updated = await prisma.opsSopLibrary.update({
      where: { id },
      data: {
        isActive: true,
        archivedAt: null,
        archivedById: null,
        updatedById: req.user.id
      }
    });

    return res.json({ success: true, message: 'SOP library item restored successfully', data: updated });
  } catch (err) {
    console.error('restoreSopLibrary error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore SOP library item' });
  }
};

// ── TRIP LEADER ASSIGNMENT ──
exports.getTripLeader = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role has no access to leader assignments' });
    }

    const leaders = await prisma.opsTripLeader.findMany({
      where: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        archivedAt: null
      },
      include: {
        assignedBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
        archivedBy: { select: { id: true, name: true } },
        activities: {
          include: { actor: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    return res.json({ success: true, data: leaders });
  } catch (err) {
    console.error('getTripLeader error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch trip leaders' });
  }
};

exports.assignTripLeader = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to assign leaders' });
    }

    const { leaderName, leaderPhone, leaderType, isPrimary, notes } = req.body;
    if (!leaderName || !leaderPhone) {
      return res.status(400).json({ success: false, message: 'Leader name and phone contact are required' });
    }

    if (leaderType && !['INTERNAL', 'FREELANCE'].includes(leaderType)) {
      return res.status(400).json({ success: false, message: 'Invalid leader type value' });
    }

    const existing = await prisma.opsTripLeader.findFirst({
      where: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        leaderPhone
      }
    });

    let leader;
    await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.opsTripLeader.updateMany({
          where: {
            tenantId: ctx.tenantId,
            tripId: ctx.tripId,
            departureDate: ctx.departureDate,
            archivedAt: null
          },
          data: { isPrimary: false }
        });
      }

      if (existing) {
        leader = await tx.opsTripLeader.update({
          where: { id: existing.id },
          data: {
            leaderName,
            leaderType: leaderType || existing.leaderType,
            isPrimary: !!isPrimary,
            notes: notes !== undefined ? notes : existing.notes,
            archivedAt: null,
            archivedById: null,
            updatedById: req.user.id
          }
        });

        await tx.opsTripLeaderActivity.create({
          data: {
            tenantId: ctx.tenantId,
            leaderAssignmentId: leader.id,
            action: 'ASSIGN',
            beforeValue: existing,
            afterValue: leader,
            actorId: req.user.id,
            notes: 'Reassigned/updated trip leader'
          }
        });
      } else {
        leader = await tx.opsTripLeader.create({
          data: {
            tenantId: ctx.tenantId,
            tripId: ctx.tripId,
            departureDate: ctx.departureDate,
            leaderName,
            leaderPhone,
            leaderType: leaderType || 'INTERNAL',
            isPrimary: !!isPrimary,
            notes: notes || null,
            assignedById: req.user.id,
            updatedById: req.user.id
          }
        });

        await tx.opsTripLeaderActivity.create({
          data: {
            tenantId: ctx.tenantId,
            leaderAssignmentId: leader.id,
            action: 'ASSIGN',
            beforeValue: null,
            afterValue: leader,
            actorId: req.user.id,
            notes: 'Assigned new trip leader'
          }
        });
      }
    });

    return res.json({ success: true, data: leader });
  } catch (err) {
    console.error('assignTripLeader error:', err);
    return res.status(500).json({ success: false, message: 'Failed to assign trip leader' });
  }
};

exports.patchTripLeader = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to update leaders' });
    }

    const { id, leaderPhone: lookupPhone, leaderName, leaderPhone, leaderType, isPrimary, notes } = req.body;

    const existing = await prisma.opsTripLeader.findFirst({
      where: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        OR: [
          id ? { id } : null,
          lookupPhone ? { leaderPhone: lookupPhone } : null
        ].filter(Boolean)
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Leader assignment not found for this departure' });
    }

    if (leaderType && !['INTERNAL', 'FREELANCE'].includes(leaderType)) {
      return res.status(400).json({ success: false, message: 'Invalid leader type value' });
    }

    let updated;
    await prisma.$transaction(async (tx) => {
      if (isPrimary) {
        await tx.opsTripLeader.updateMany({
          where: {
            tenantId: ctx.tenantId,
            tripId: ctx.tripId,
            departureDate: ctx.departureDate,
            id: { not: existing.id },
            archivedAt: null
          },
          data: { isPrimary: false }
        });
      }

      updated = await tx.opsTripLeader.update({
        where: { id: existing.id },
        data: {
          leaderName: leaderName !== undefined ? leaderName : existing.leaderName,
          leaderPhone: leaderPhone !== undefined ? leaderPhone : existing.leaderPhone,
          leaderType: leaderType !== undefined ? leaderType : existing.leaderType,
          isPrimary: isPrimary !== undefined ? !!isPrimary : existing.isPrimary,
          notes: notes !== undefined ? notes : existing.notes,
          updatedById: req.user.id
        }
      });

      await tx.opsTripLeaderActivity.create({
        data: {
          tenantId: ctx.tenantId,
          leaderAssignmentId: existing.id,
          action: 'UPDATE',
          beforeValue: existing,
          afterValue: updated,
          actorId: req.user.id,
          notes: 'Updated leader details'
        }
      });
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('patchTripLeader error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update trip leader' });
  }
};

exports.archiveTripLeader = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to archive leaders' });
    }

    const { id, leaderPhone } = req.body;

    const existing = await prisma.opsTripLeader.findFirst({
      where: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        OR: [
          id ? { id } : null,
          leaderPhone ? { leaderPhone } : null
        ].filter(Boolean)
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Leader assignment not found for this departure' });
    }

    let updated;
    await prisma.$transaction(async (tx) => {
      updated = await tx.opsTripLeader.update({
        where: { id: existing.id },
        data: {
          archivedAt: new Date(),
          archivedById: req.user.id
        }
      });

      await tx.opsTripLeaderActivity.create({
        data: {
          tenantId: ctx.tenantId,
          leaderAssignmentId: existing.id,
          action: 'ARCHIVE',
          beforeValue: existing,
          afterValue: updated,
          actorId: req.user.id,
          notes: 'Archived leader assignment'
        }
      });
    });

    return res.json({ success: true, message: 'Leader assignment archived successfully', data: updated });
  } catch (err) {
    console.error('archiveTripLeader error:', err);
    return res.status(500).json({ success: false, message: 'Failed to archive trip leader' });
  }
};

exports.restoreTripLeader = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    if (req.user?.role === 'sales') {
      return res.status(403).json({ success: false, message: 'Sales role is not allowed to restore leaders' });
    }

    const { id, leaderPhone } = req.body;

    const existing = await prisma.opsTripLeader.findFirst({
      where: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        OR: [
          id ? { id } : null,
          leaderPhone ? { leaderPhone } : null
        ].filter(Boolean)
      }
    });

    if (!existing) {
      return res.status(404).json({ success: false, message: 'Leader assignment not found for this departure' });
    }

    let updated;
    await prisma.$transaction(async (tx) => {
      updated = await tx.opsTripLeader.update({
        where: { id: existing.id },
        data: {
          archivedAt: null,
          archivedById: null
        }
      });

      await tx.opsTripLeaderActivity.create({
        data: {
          tenantId: ctx.tenantId,
          leaderAssignmentId: existing.id,
          action: 'RESTORE',
          beforeValue: existing,
          afterValue: updated,
          actorId: req.user.id,
          notes: 'Restored leader assignment'
        }
      });
    });

    return res.json({ success: true, message: 'Leader assignment restored successfully', data: updated });
  } catch (err) {
    console.error('restoreTripLeader error:', err);
    return res.status(500).json({ success: false, message: 'Failed to restore trip leader' });
  }
};

// ── OPERATIONS DAY-WISE ACTIVITIES ──

exports.getActivities = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    const activities = await prisma.opsActivity.findMany({
      where: ctx.where,
      orderBy: [
        { dayNumber: 'asc' },
        { order: 'asc' },
        { createdAt: 'asc' }
      ],
      include: {
        responsibleGuide: { select: { id: true, name: true, email: true } },
        vendor: { select: { id: true, name: true, type: true } }
      }
    });

    return res.json({ success: true, data: activities });
  } catch (err) {
    console.error('getActivities error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch activities' });
  }
};

exports.createActivity = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    const {
      dayNumber,
      date,
      name,
      type,
      startTime,
      endTime,
      location,
      description,
      responsibleGuideId,
      responsibleStaff,
      vendorId,
      vendorName,
      estimatedCost,
      actualCost,
      maxParticipants,
      safetyInstructions,
      requiredEquipment,
      status,
      remarks,
      order
    } = req.body;

    const activity = await prisma.opsActivity.create({
      data: {
        tenantId: ctx.tenantId,
        tripId: ctx.tripId,
        departureDate: ctx.departureDate,
        dayNumber: Number(dayNumber) || 1,
        date: date ? new Date(date) : null,
        name,
        type,
        startTime,
        endTime,
        location,
        description,
        responsibleGuideId: responsibleGuideId || null,
        responsibleStaff,
        vendorId: vendorId || null,
        vendorName,
        estimatedCost: Number(estimatedCost) || 0,
        actualCost: Number(actualCost) || 0,
        maxParticipants: Number(maxParticipants) || 0,
        safetyInstructions,
        requiredEquipment,
        status: status || 'Planned',
        remarks,
        order: Number(order) || 0
      }
    });

    return res.status(201).json({ success: true, data: activity });
  } catch (err) {
    console.error('createActivity error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create activity' });
  }
};

exports.updateActivity = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      dayNumber,
      date,
      name,
      type,
      startTime,
      endTime,
      location,
      description,
      responsibleGuideId,
      responsibleStaff,
      vendorId,
      vendorName,
      estimatedCost,
      actualCost,
      maxParticipants,
      safetyInstructions,
      requiredEquipment,
      status,
      remarks,
      order
    } = req.body;

    const participants =
      req.body.maxParticipants !== undefined
        ? Number(req.body.maxParticipants)
        : req.body.bookedCount !== undefined
          ? Number(req.body.bookedCount)
          : req.body.pax !== undefined
            ? Number(req.body.pax)
            : undefined;

    const vendorCostVal =
      req.body.estimatedCost !== undefined
        ? Number(req.body.estimatedCost)
        : req.body.vendorCost !== undefined
          ? Number(req.body.vendorCost)
          : undefined;

    const activity = await prisma.opsActivity.update({
      where: { id },
      data: {
        dayNumber: dayNumber !== undefined ? Number(dayNumber) : undefined,
        date: date !== undefined ? (date ? new Date(date) : null) : undefined,
        name: req.body.name,
        type: req.body.type || req.body.category,
        startTime: req.body.startTime || req.body.scheduledTime,
        endTime: req.body.endTime,
        location: req.body.location,
        description: req.body.description || req.body.notes,
        responsibleGuideId: responsibleGuideId !== undefined ? (responsibleGuideId || null) : undefined,
        responsibleStaff: req.body.responsibleStaff || req.body.guideName,
        vendorId: vendorId !== undefined ? (vendorId || null) : undefined,
        vendorName: req.body.vendorName,
        estimatedCost: vendorCostVal,
        actualCost: actualCost !== undefined ? Number(actualCost) : undefined,
        maxParticipants: participants,
        safetyInstructions: req.body.safetyInstructions,
        requiredEquipment: req.body.requiredEquipment,
        status: req.body.status,
        remarks: req.body.remarks !== undefined ? req.body.remarks : req.body.notes,
        order: order !== undefined ? Number(order) : undefined
      }
    });

    return res.json({ success: true, data: activity });
  } catch (err) {
    console.error('updateActivity error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update activity' });
  }
};

exports.deleteActivity = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.opsActivity.delete({
      where: { id }
    });
    return res.json({ success: true, message: 'Activity deleted successfully' });
  } catch (err) {
    console.error('deleteActivity error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete activity' });
  }
};

exports.copyActivities = async (req, res) => {
  try {
    const ctx = await parseDepartureFilter(req, res, true);
    if (!ctx) return;

    const { fromTripId, fromDepartureDate } = req.body;

    if (!fromTripId || !fromDepartureDate) {
      return res.status(400).json({ success: false, message: 'fromTripId and fromDepartureDate are required' });
    }

    const fromDate = new Date(fromDepartureDate);
    if (isNaN(fromDate.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid fromDepartureDate format' });
    }

    const sourceActivities = await prisma.opsActivity.findMany({
      where: {
        tenantId: ctx.tenantId,
        tripId: fromTripId,
        departureDate: fromDate
      }
    });

    if (sourceActivities.length === 0) {
      return res.status(404).json({ success: false, message: 'No activities found in the source departure to copy' });
    }

    const newActivities = await Promise.all(
      sourceActivities.map(async (act) => {
        return prisma.opsActivity.create({
          data: {
            tenantId: ctx.tenantId,
            tripId: ctx.tripId,
            departureDate: ctx.departureDate,
            dayNumber: act.dayNumber,
            date: ctx.departureDate,
            name: act.name,
            type: act.type,
            startTime: act.startTime,
            endTime: act.endTime,
            location: act.location,
            description: act.description,
            responsibleGuideId: act.responsibleGuideId,
            responsibleStaff: act.responsibleStaff,
            vendorId: act.vendorId,
            vendorName: act.vendorName,
            estimatedCost: act.estimatedCost,
            actualCost: 0,
            maxParticipants: act.maxParticipants,
            safetyInstructions: act.safetyInstructions,
            requiredEquipment: act.requiredEquipment,
            status: 'Planned',
            remarks: act.remarks,
            order: act.order
          }
        });
      })
    );

    return res.json({ success: true, message: `Successfully copied ${newActivities.length} activities`, data: newActivities });
  } catch (err) {
    console.error('copyActivities error:', err);
    return res.status(500).json({ success: false, message: 'Failed to copy activities' });
  }
};

exports.getVendorRates = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const rates = await prisma.opsVendorHotelRate.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: rates });
  } catch (err) {
    console.error('getVendorRates error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch vendor rates' });
  }
};

exports.saveVendorRate = async (req, res) => {
  try {
    const { vendorId } = req.params;
    const {
      id,
      rateName,
      rateType,
      doubleRate,
      tripleRate,
      quadRate,
      singleRate,
      extraBedRate,
      childWithBed,
      childWithoutBed,
      mealPlan,
      mealPlanRate,
      taxPercent,
      validFrom,
      validUntil,
      isActive
    } = req.body;

    // Validations
    if (!rateType) {
      return res.status(400).json({ success: false, message: 'Rate type is required' });
    }
    const dRate = parseFloat(doubleRate || 0);
    const tRate = parseFloat(tripleRate || 0);
    const qRate = parseFloat(quadRate || 0);
    const sRate = parseFloat(singleRate || 0);
    const exRate = parseFloat(extraBedRate || 0);
    const cWithBed = parseFloat(childWithBed || 0);
    const cWithoutBed = parseFloat(childWithoutBed || 0);
    const mpRate = parseFloat(mealPlanRate || 0);
    const tax = parseFloat(taxPercent || 0);

    if (
      dRate < 0 || tRate < 0 || qRate < 0 || sRate < 0 ||
      exRate < 0 || cWithBed < 0 || cWithoutBed < 0 || mpRate < 0 || tax < 0
    ) {
      return res.status(400).json({ success: false, message: 'Rates cannot be negative' });
    }

    if (validFrom && validUntil && new Date(validUntil) < new Date(validFrom)) {
      return res.status(400).json({ success: false, message: 'Valid Until date cannot be earlier than Valid From date' });
    }

    const dataObj = {
      tenantId: 'default',
      vendorId,
      rateName,
      rateType,
      doubleRate: dRate,
      tripleRate: tRate,
      quadRate: qRate,
      singleRate: sRate,
      extraBedRate: exRate,
      childWithBed: cWithBed,
      childWithoutBed: cWithoutBed,
      mealPlan,
      mealPlanRate: mpRate,
      taxPercent: tax,
      validFrom: validFrom ? new Date(validFrom) : null,
      validUntil: validUntil ? new Date(validUntil) : null,
      isActive: isActive !== false
    };

    let rateRecord;
    if (id) {
      rateRecord = await prisma.opsVendorHotelRate.update({
        where: { id },
        data: dataObj
      });
    } else {
      rateRecord = await prisma.opsVendorHotelRate.create({
        data: dataObj
      });
    }

    return res.status(201).json({ success: true, data: rateRecord });
  } catch (err) {
    console.error('saveVendorRate error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save vendor rate' });
  }
};

exports.createHotelOverride = async (req, res) => {
  try {
    const { departureHotelId, fieldName, originalValue, overriddenValue, reason } = req.body;
    const allowedRoles = ['operations manager', 'admin', 'superadmin'];
    if (!allowedRoles.includes(req.user.role?.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Not authorized to override prices' });
    }

    const override = await prisma.departureHotelRateOverride.create({
      data: {
        departureHotelId,
        fieldName,
        originalValue: parseFloat(originalValue || 0),
        overriddenValue: parseFloat(overriddenValue || 0),
        reason,
        overriddenById: req.user.id || 'system'
      }
    });

    // Update the booking total to match overridden value
    const booking = await prisma.opsHotelBooking.update({
      where: { id: departureHotelId },
      data: {
        totalAmount: parseFloat(overriddenValue || 0),
        balanceAmount: parseFloat(overriddenValue || 0) - parseFloat(req.body.advancePaid || 0)
      }
    });

    return res.status(201).json({ success: true, data: { override, booking } });
  } catch (err) {
    console.error('createHotelOverride error:', err);
    return res.status(500).json({ success: false, message: 'Failed to apply price override' });
  }
};

exports.resetHotelOverride = async (req, res) => {
  try {
    const { departureHotelId } = req.body;
    const allowedRoles = ['operations manager', 'admin', 'superadmin'];
    if (!allowedRoles.includes(req.user.role?.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Not authorized to reset overrides' });
    }

    // Delete overrides
    await prisma.departureHotelRateOverride.deleteMany({
      where: { departureHotelId }
    });

    // Retrieve snapshot rates to restore cost
    const booking = await prisma.opsHotelBooking.findUnique({
      where: { id: departureHotelId }
    });

    if (booking && booking.rateId) {
      const dRate = booking.doubleRate || 0;
      const tRate = booking.tripleRate || 0;
      const qRate = booking.quadRate || 0;
      const exRate = booking.extraBedRate || 0;
      const dRooms = booking.doubleRoomsCount || 0;
      const tRooms = booking.tripleRoomsCount || 0;
      const qRooms = booking.quadRoomsCount || 0;
      const exPax = booking.extraPersonsCount || 0;
      const nights = booking.nightsCount || 1;

      let baseCost = calculateHotelStayCost({
        pricingMethod:
          booking.rateType === "PER_PERSON_PER_NIGHT"
            ? "per-person"
            : booking.pricingMethod || "room-wise",
        doubleRoomsCount: dRooms,
        tripleRoomsCount: tRooms,
        quadRoomsCount: qRooms,
        extraPersonsCount: exPax,
        nightsCount: nights,
        doubleRate: dRate,
        tripleRate: tRate,
        quadRate: qRate,
        extraBedRate: exRate,
      });

      const taxAmount = baseCost * (booking.taxPercent || 0) / 100;
      const restoredCost = baseCost + taxAmount;

      const updated = await prisma.opsHotelBooking.update({
        where: { id: departureHotelId },
        data: {
          totalAmount: restoredCost,
          balanceAmount: restoredCost - (booking.advancePaid || 0)
        }
      });

      return res.json({ success: true, message: 'Price reset to vendor rate snapshot', data: updated });
    }

    return res.status(400).json({ success: false, message: 'No valid rate snapshot found to reset to' });
  } catch (err) {
    console.error('resetHotelOverride error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset overrides' });
  }
};


module.exports = {
  normalizeDepartureDateIndia,
  ...exports
};

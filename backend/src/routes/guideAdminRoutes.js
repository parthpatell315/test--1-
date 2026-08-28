const express = require("express");
const router = express.Router();
const { prisma } = require("../lib/prisma");
const { authenticate, requirePermission } = require("../middleware/auth");

const requireOpsView = [authenticate, requirePermission("ops.view")];
const requireOpsManage = [authenticate, requirePermission("ops.manage")];
const requireTripsView = [authenticate, requirePermission("trips.view")];

// 2. Admin Dashboard summary for Guide management
router.get("/admin/dashboard", ...requireOpsView, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const tripsCount = await prisma.trip
      .count({ where: { tenantId } })
      .catch(() => 0);
    res.json({
      activeTrips: tripsCount,
      totalGuides: 5,
      todayCheckIns: 3,
      missingCheckIns: 0,
      locationMismatchFlags: 0,
    });
  } catch (err) {
    res.json({
      activeTrips: 10,
      totalGuides: 5,
      todayCheckIns: 3,
      missingCheckIns: 0,
      locationMismatchFlags: 0,
    });
  }
});

// 3. Admin Expenses list for Guide management
router.get("/admin/expenses", ...requireOpsView, async (req, res) => {
  res.json([]);
});

// 4. Admin Trip Status Recent
router.get("/admin/trip-status/recent", ...requireOpsView, async (req, res) => {
  res.json([]);
});

// 5. Admin Guides list
router.get("/admin/guides", ...requireOpsView, async (req, res) => {
  res.json([]);
});

// 6. Admin Attendance Logs
router.get("/admin/attendance-logs", ...requireOpsView, async (req, res) => {
  res.json([]);
});

// 7. Admin Operations Alerts
router.get("/admin/operations/alerts", ...requireOpsView, async (req, res) => {
  res.json([]);
});

// 8. Admin Main Trips (authenticated staff catalog; tenant-scoped)
router.get("/admin/main-trips", ...requireTripsView, async (req, res) => {
  try {
    const tenantId = req.user?.tenantId || "default";
    const trips = await prisma.trip.findMany({
      where: { tenantId },
      select: { id: true, title: true, price: true, availableDates: true },
    });
    const formatted = trips.map((t) => ({
      id: t.id,
      tripCode: t.id,
      title: t.title,
      tripName: t.title,
      price: t.price,
      availableDates: t.availableDates,
    }));
    res.json(formatted);
  } catch (err) {
    res.json([]);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-VENDOR HOTEL & DEPARTURE STAY ASSIGNMENT ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// Mock / In-memory store for Hotel Master, Hotel-Vendor Contracts, and Departure Stays
const mockHotels = [
  {
    id: "HTL-1",
    name: "Apple Blossom",
    city: "Sangla",
    category: "Standard",
    rating: "★★★★",
    roomsAvailable: { Twin: 10, Triple: 8, Quad: 4 },
    address: "Main Bazaar, Sangla, HP",
  },
  {
    id: "HTL-2",
    name: "Hotel Snow View",
    city: "Shimla",
    category: "Deluxe",
    rating: "★★★★★",
    roomsAvailable: { Twin: 15, Triple: 10, Quad: 5 },
    address: "Mall Road, Shimla, HP",
  },
  {
    id: "HTL-3",
    name: "Mehak Resort",
    city: "Sangla",
    category: "Luxury",
    rating: "★★★★",
    roomsAvailable: { Twin: 12, Triple: 6, Quad: 2 },
    address: "Baspa Valley, Sangla, HP",
  },
  {
    id: "HTL-4",
    name: "Spiti Siddharth",
    city: "Kaza",
    category: "Standard",
    rating: "★★★★",
    roomsAvailable: { Twin: 8, Triple: 6, Quad: 4 },
    address: "Old Kaza, HP",
  },
  {
    id: "HTL-5",
    name: "Mountain Vista",
    city: "Tabo",
    category: "Deluxe",
    rating: "★★★★★",
    roomsAvailable: { Twin: 14, Triple: 8, Quad: 4 },
    address: "Tabo Monastery Road, HP",
  },
];

const mockHotelVendors = [
  {
    id: "HV-1",
    hotelId: "HTL-1",
    vendorId: "VND-1",
    vendorName: "Direct Hotel",
    negotiatedRate: 3200,
    lastUsedRate: 3200,
    paymentTerms: "100% at Check-in",
    outstandingAmount: 0,
    defaultVendor: true,
    commission: "0%",
    active: true,
  },
  {
    id: "HV-2",
    hotelId: "HTL-1",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    negotiatedRate: 2950,
    lastUsedRate: 3000,
    paymentTerms: "50% Advance, 50% Post-Trip",
    outstandingAmount: 45000,
    defaultVendor: false,
    commission: "8%",
    active: true,
  },
  {
    id: "HV-3",
    hotelId: "HTL-1",
    vendorId: "VND-3",
    vendorName: "XYZ Travels",
    negotiatedRate: 3100,
    lastUsedRate: 3150,
    paymentTerms: "7 Days Credit",
    outstandingAmount: 12000,
    defaultVendor: false,
    commission: "5%",
    active: true,
  },
  {
    id: "HV-4",
    hotelId: "HTL-2",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    negotiatedRate: 4200,
    lastUsedRate: 4200,
    paymentTerms: "50% Advance",
    outstandingAmount: 45000,
    defaultVendor: true,
    commission: "10%",
    active: true,
  },
  {
    id: "HV-5",
    hotelId: "HTL-3",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    negotiatedRate: 3600,
    lastUsedRate: 3600,
    paymentTerms: "50% Advance",
    outstandingAmount: 45000,
    defaultVendor: true,
    commission: "10%",
    active: true,
  },
  {
    id: "HV-6",
    hotelId: "HTL-4",
    vendorId: "VND-4",
    vendorName: "Spiti Valley Escapes",
    negotiatedRate: 2800,
    lastUsedRate: 2800,
    paymentTerms: "100% Advance",
    outstandingAmount: 0,
    defaultVendor: true,
    commission: "5%",
    active: true,
  },
  {
    id: "HV-7",
    hotelId: "HTL-5",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    negotiatedRate: 3800,
    lastUsedRate: 3800,
    paymentTerms: "50% Advance",
    outstandingAmount: 45000,
    defaultVendor: true,
    commission: "10%",
    active: true,
  },
  {
    id: "HV-8",
    hotelId: "HTL-5",
    vendorId: "VND-5",
    vendorName: "ABC Travels",
    negotiatedRate: 3900,
    lastUsedRate: 3950,
    paymentTerms: "15 Days Credit",
    outstandingAmount: 25000,
    defaultVendor: false,
    commission: "7%",
    active: true,
  },
];

// ── DEV-ONLY MOCK GUARD ─────────────────────────────────────────────
// The mock departure stays / hotel vendors below are development scaffolds.
// They must NEVER be served in production — real data comes from the DB.
const isMockDataEnabled = process.env.NODE_ENV !== "production";
const mockDisabledResponse = (res) =>
  res.status(404).json({
    success: false,
    message: "Mock departure data is disabled in production",
  });

let mockDepartureStays = [
  {
    id: "STAY-1",
    departureId: "SPT-1",
    day: "Day 2",
    destination: "Shimla",
    hotelId: "HTL-2",
    hotelName: "Hotel Snow View",
    hotelRating: "★★★★★",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    checkIn: "05 Aug 2026",
    checkOut: "06 Aug 2026",
    nights: 1,
    rooms: { Twin: 3, Triple: 2, Quad: 0 },
    totalGuests: 16,
    vendorRate: 4200,
    sellingRate: 5500,
    totalAmount: 21000,
    advancePaid: 10500,
    balanceAmount: 10500,
    mealPlan: "MAP (Breakfast & Dinner)",
    voucherUrl: "https://youthcamping.online/vouchers/stay-1.pdf",
    voucherStatus: "UPLOADED",
    invoiceStatus: "PENDING",
    status: "Hotel Confirmed",
    remarks: "Early check-in requested for 2 rooms",
    timeline: [
      { step: "Draft", completed: true, timestamp: "01 Aug 2026 10:00 AM" },
      {
        step: "Rate Finalized",
        completed: true,
        timestamp: "01 Aug 2026 11:30 AM",
      },
      {
        step: "Voucher Sent",
        completed: true,
        timestamp: "02 Aug 2026 02:15 PM",
      },
      {
        step: "Hotel Confirmed",
        completed: true,
        timestamp: "02 Aug 2026 04:00 PM",
      },
      { step: "Checked In", completed: false },
      { step: "Checked Out", completed: false },
      { step: "Invoice Received", completed: false },
      { step: "Paid", completed: false },
      { step: "Closed", completed: false },
    ],
  },
  {
    id: "STAY-2",
    departureId: "SPT-1",
    day: "Day 3",
    destination: "Sangla",
    hotelId: "HTL-3",
    hotelName: "Mehak Resort",
    hotelRating: "★★★★",
    vendorId: "VND-2",
    vendorName: "Mountain Hospitality",
    checkIn: "06 Aug 2026",
    checkOut: "07 Aug 2026",
    nights: 1,
    rooms: { Twin: 3, Triple: 2, Quad: 0 },
    totalGuests: 16,
    vendorRate: 3600,
    sellingRate: 4800,
    totalAmount: 18400,
    advancePaid: 9200,
    balanceAmount: 9200,
    mealPlan: "MAP (Breakfast & Dinner)",
    voucherUrl: "https://youthcamping.online/vouchers/stay-2.pdf",
    voucherStatus: "UPLOADED",
    invoiceStatus: "PENDING",
    status: "Hotel Confirmed",
    remarks: "Riverside rooms preferred",
    timeline: [
      { step: "Draft", completed: true, timestamp: "01 Aug 2026 10:00 AM" },
      {
        step: "Rate Finalized",
        completed: true,
        timestamp: "01 Aug 2026 11:45 AM",
      },
      {
        step: "Voucher Sent",
        completed: true,
        timestamp: "02 Aug 2026 02:30 PM",
      },
      {
        step: "Hotel Confirmed",
        completed: true,
        timestamp: "02 Aug 2026 04:30 PM",
      },
      { step: "Checked In", completed: false },
      { step: "Checked Out", completed: false },
      { step: "Invoice Received", completed: false },
      { step: "Paid", completed: false },
      { step: "Closed", completed: false },
    ],
  },
];

// 9. Get all Hotel Master properties
router.get("/admin/hotels", ...requireOpsView, async (req, res) => {
  if (!isMockDataEnabled) return mockDisabledResponse(res);
  const { city } = req.query;
  const filtered = city
    ? mockHotels.filter((h) => h.city.toLowerCase() === city.toLowerCase())
    : mockHotels;
  res.json({ success: true, data: filtered });
});

// 9b. Create a new Hotel Master property (without vendorId)
router.post("/admin/hotels", ...requireOpsManage, async (req, res) => {
  try {
    const newHotel = {
      id: `HTL-${Date.now()}`,
      name: req.body.name || "New Hotel",
      city: req.body.city || "Manali",
      category: req.body.category || "Deluxe",
      rating: req.body.rating || 4,
      totalRooms: req.body.totalRooms || 20,
      contactPerson: req.body.contactPerson || "",
      phone: req.body.phone || "",
      // CRITICAL: NO vendorId! Decoupled Hotel Master.
    };
    mockHotels.push(newHotel);
    res.status(201).json({ success: true, data: newHotel });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 10. Get Hotel-Vendor contracts (supports filtering by hotelId or vendorId)
router.get("/admin/hotel-vendors", ...requireOpsView, async (req, res) => {
  if (!isMockDataEnabled) return mockDisabledResponse(res);
  const { hotelId, vendorId } = req.query;
  let filtered = mockHotelVendors;
  if (hotelId) filtered = filtered.filter((hv) => hv.hotelId === hotelId);
  if (vendorId) filtered = filtered.filter((hv) => hv.vendorId === vendorId);
  res.json({ success: true, data: filtered });
});

// 10b. Create a new Hotel-Vendor Contract mapping
router.post("/admin/hotel-vendors", ...requireOpsManage, async (req, res) => {
  try {
    const newContract = {
      id: `CTR-${Date.now()}`,
      hotelId: req.body.hotelId || "HTL-1",
      vendorId: req.body.vendorId || "VND-1",
      vendorName: req.body.vendorName || "Mountain Hospitality",
      contractType: req.body.contractType || "SEASONAL",
      negotiatedRates: req.body.negotiatedRates || {},
      paymentTerms: req.body.paymentTerms || "Standard",
    };
    mockHotelVendors.push(newContract);
    res.status(201).json({ success: true, data: newContract });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// 11. Get Departure Stays for a departure
router.get(
  "/admin/departure-stays/:departureId",
  ...requireOpsView,
  async (req, res) => {
    if (!isMockDataEnabled) return mockDisabledResponse(res);
    const { departureId } = req.params;
    const stays = mockDepartureStays.filter(
      (s) => s.departureId === departureId || departureId === "all",
    );
    res.json({ success: true, data: stays });
  },
);

// 12. Create/Assign a new Departure Stay (from Step 4 Wizard)
router.post("/admin/departure-stays", ...requireOpsManage, async (req, res) => {
    try {
      if (!isMockDataEnabled) return mockDisabledResponse(res);
      const newStay = {
        id: `STAY-${Date.now()}`,
        departureId: req.body.departureId || "SPT-1",
        day: req.body.day || `Day ${mockDepartureStays.length + 1}`,
        destination: req.body.destination || "Shimla",
        hotelId: req.body.hotelId || "HTL-1",
        hotelName: req.body.hotelName || "Apple Blossom",
        hotelRating: req.body.hotelRating || "★★★★",
        vendorId: req.body.vendorId || "VND-1",
        vendorName: req.body.vendorName || "Direct Hotel",
        checkIn: req.body.checkIn || "08 Aug 2026",
        checkOut: req.body.checkOut || "09 Aug 2026",
        nights: Number(req.body.nights) || 1,
        rooms: req.body.rooms || { Twin: 2, Triple: 1, Quad: 0 },
        totalGuests: Number(req.body.totalGuests) || 7,
        vendorRate: Number(req.body.vendorRate) || 3200,
        sellingRate: Number(req.body.sellingRate) || 4200,
        totalAmount: Number(req.body.totalAmount) || 9600,
        advancePaid: Number(req.body.advancePaid) || 0,
        balanceAmount: Number(req.body.totalAmount) || 9600,
        mealPlan: req.body.mealPlan || "MAP",
        voucherUrl: req.body.voucherUrl || null,
        voucherStatus: "PENDING",
        invoiceStatus: "PENDING",
        status: req.body.status || "Draft",
        remarks: req.body.remarks || "",
        timeline: [
          {
            step: "Draft",
            completed: true,
            timestamp: new Date().toLocaleString(),
          },
          { step: "Rate Finalized", completed: false },
          { step: "Voucher Sent", completed: false },
          { step: "Hotel Confirmed", completed: false },
          { step: "Checked In", completed: false },
          { step: "Checked Out", completed: false },
          { step: "Invoice Received", completed: false },
          { step: "Paid", completed: false },
          { step: "Closed", completed: false },
        ],
      };
      mockDepartureStays.push(newStay);
      res.status(201).json({ success: true, data: newStay });
    } catch (err) {
      res
        .status(500)
        .json({ success: false, error: "Failed to create stay assignment" });
    }
});

// 13. Update Stay Status or Details
router.put("/admin/departure-stays/:id", ...requireOpsManage, async (req, res) => {
    if (!isMockDataEnabled) return mockDisabledResponse(res);
    const { id } = req.params;
    const idx = mockDepartureStays.findIndex((s) => s.id === id);
    if (idx === -1)
      return res.status(404).json({ success: false, error: "Stay not found" });

    mockDepartureStays[idx] = { ...mockDepartureStays[idx], ...req.body };
    res.json({ success: true, data: mockDepartureStays[idx] });
});

module.exports = router;

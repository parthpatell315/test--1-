process.env.JWT_SECRET =
  process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
    ? process.env.JWT_SECRET
    : "preprod-security-test-secret-32chars-min";

jest.mock("../src/lib/prisma", () => ({
  prisma: {
    admin: { findUnique: jest.fn(), findFirst: jest.fn() },
    user: { findUnique: jest.fn() },
    trip: { findMany: jest.fn(), count: jest.fn() },
    booking: { findFirst: jest.fn() },
    payment: { findMany: jest.fn() },
    opsClientPayment: { findMany: jest.fn() },
    paymentReceivingAccount: { findMany: jest.fn(), count: jest.fn() },
  },
}));

jest.mock("cloudinary", () => ({
  v2: {
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn().mockResolvedValue({ result: "ok" }),
    },
  },
}));

const request = require("supertest");
const express = require("express");
const jwt = require("jsonwebtoken");
const { prisma } = require("../src/lib/prisma");
const uploadRoutes = require("../src/routes/uploadRoutes");
const paymentRoutes = require("../src/routes/paymentRoutes");
const guideAdminRoutes = require("../src/routes/guideAdminRoutes");
const { getBookingPayments } = require("../src/controllers/paymentController");

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/upload", uploadRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api", guideAdminRoutes);
  return app;
}

const app = buildApp();

function signToken(id) {
  return jwt.sign({ id, tokenVersion: 0 }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
}

const USERS = {
  ops: {
    id: "ops_1",
    name: "Ops",
    email: "ops@test.com",
    role: "operations",
    tenantId: "tenant-a",
    isActive: true,
    tokenVersion: 0,
    customPermissions: [],
  },
  sales: {
    id: "sales_1",
    name: "Sales",
    email: "sales@test.com",
    role: "sales",
    tenantId: "tenant-a",
    isActive: true,
    tokenVersion: 0,
    customPermissions: [],
  },
  intern: {
    id: "intern_1",
    name: "Intern",
    email: "intern@test.com",
    role: "intern",
    tenantId: "tenant-a",
    isActive: true,
    tokenVersion: 0,
    customPermissions: [],
  },
  viewer: {
    id: "viewer_1",
    name: "Viewer",
    email: "viewer@test.com",
    role: "viewer",
    tenantId: "tenant-a",
    isActive: true,
    tokenVersion: 0,
    customPermissions: [],
  },
};

beforeEach(() => {
  jest.clearAllMocks();
  prisma.admin.findUnique.mockImplementation(({ where }) => {
    const user = Object.values(USERS).find((u) => u.id === where.id);
    return Promise.resolve(user || null);
  });
  prisma.user.findUnique.mockResolvedValue(null);
  prisma.trip.findMany.mockResolvedValue([]);
  prisma.booking.findFirst.mockResolvedValue(null);
  prisma.payment.findMany.mockResolvedValue([]);
  prisma.opsClientPayment.findMany.mockResolvedValue([]);
  prisma.paymentReceivingAccount.findMany.mockResolvedValue([]);
  prisma.paymentReceivingAccount.count.mockResolvedValue(0);
});

describe("Travel Desk removal", () => {
  it("does not mount /api/travel-desk on the main app", () => {
    const appJs = require("fs").readFileSync(
      require("path").join(__dirname, "../src/app.js"),
      "utf8",
    );
    expect(appJs).not.toMatch(/travel-desk|travelDeskRoutes/);
  });
});

describe("Upload route security", () => {
  it("DELETE /api/upload/photo returns 401 without auth", async () => {
    const res = await request(app)
      .delete("/api/upload/photo")
      .send({ url: "/uploads/trips/test.jpg" });
    expect(res.status).toBe(401);
  });

  it("DELETE /api/upload/photo returns 403 for staff without upload perms", async () => {
    const res = await request(app)
      .delete("/api/upload/photo")
      .set("Authorization", `Bearer ${signToken("intern_1")}`)
      .send({ url: "/uploads/trips/test.jpg" });
    expect(res.status).toBe(403);
  });

  it("POST /api/upload/single returns 401 without auth", async () => {
    const res = await request(app).post("/api/upload/single");
    expect(res.status).toBe(401);
  });

  it("DELETE /api/upload/video returns 401 without auth", async () => {
    const res = await request(app)
      .delete("/api/upload/video")
      .send({ publicId: "local_test.mp4" });
    expect(res.status).toBe(401);
  });
});

describe("Guide admin routes", () => {
  const guideEndpoints = [
    "/api/admin/dashboard",
    "/api/admin/guides",
    "/api/admin/expenses",
    "/api/admin/trip-status/recent",
    "/api/admin/attendance-logs",
    "/api/admin/operations/alerts",
  ];

  it.each(guideEndpoints)("GET %s returns 401 without auth", async (path) => {
    const res = await request(app).get(path);
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/dashboard scopes trip count by tenant for ops", async () => {
    prisma.trip.count = jest.fn().mockResolvedValue(3);
    const res = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${signToken("ops_1")}`);
    expect(res.status).toBe(200);
    expect(prisma.trip.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: "tenant-a" } }),
    );
  });
});

describe("Main trips admin catalog", () => {
  it("GET /api/admin/main-trips returns 401 without auth", async () => {
    const res = await request(app).get("/api/admin/main-trips");
    expect(res.status).toBe(401);
  });

  it("GET /api/admin/main-trips returns 403 without trips.view", async () => {
    const res = await request(app)
      .get("/api/admin/main-trips")
      .set("Authorization", `Bearer ${signToken("intern_1")}`);
    expect(res.status).toBe(403);
  });

  it("GET /api/admin/main-trips scopes trips by tenant for operations", async () => {
    prisma.trip.findMany.mockResolvedValue([{ id: "t1", title: "Spiti", price: 1000, availableDates: [] }]);
    const res = await request(app)
      .get("/api/admin/main-trips")
      .set("Authorization", `Bearer ${signToken("ops_1")}`);
    expect(res.status).toBe(200);
    expect(prisma.trip.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a" },
      }),
    );
  });
});

describe("Payment account RBAC", () => {
  it("GET /api/payments/accounts returns 401 without auth", async () => {
    const res = await request(app).get("/api/payments/accounts");
    expect(res.status).toBe(401);
  });

  it("POST /api/payments/accounts returns 403 for sales without manage perms", async () => {
    const res = await request(app)
      .post("/api/payments/accounts")
      .set("Authorization", `Bearer ${signToken("sales_1")}`)
      .send({ accountName: "Audit Account" });
    expect(res.status).toBe(403);
  });
});

describe("Booking payment tenant isolation", () => {
  function createRes() {
    const res = { statusCode: 200, body: null };
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data) => {
      res.body = data;
      return res;
    };
    return res;
  }

  it("getBookingPayments returns 404 for cross-tenant booking lookup", async () => {
    prisma.booking.findFirst.mockResolvedValue(null);
    const res = createRes();
    await getBookingPayments(
      {
        params: { bookingId: "bk_other" },
        user: { id: "ops_1", role: "operations", tenantId: "tenant-b" },
      },
      res,
    );
    expect(res.statusCode).toBe(404);
    expect(prisma.booking.findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-b",
        OR: [{ id: "bk_other" }, { bookingId: "bk_other" }],
      },
    });
  });

  it("GET /api/payments/booking/:id returns 401 without auth", async () => {
    const res = await request(app).get("/api/payments/booking/bk_1");
    expect(res.status).toBe(401);
  });
});

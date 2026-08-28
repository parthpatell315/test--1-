const express = require("express");
const router = express.Router();
const { authenticate, requirePermission } = require("../middleware/auth");
const {
  getClientPayments,
  addClientPayment,
  verifyClientPayment,
  getVendorPayments,
  getAllRecordedVendorPayments,
  createVendorPayment,
  updateVendorPayment,
  deleteVendorPayment,
  verifyVendorPayment,
  getPaymentsDashboardStats,
  getBookingPayments,
  getAllVendorPayablesQueue,
  getFinanceVerificationQueue,
  getRiyaSummary,
  updatePaymentAccount,
  syncTreasuryMappings,
} = require("../controllers/paymentController");
const collectionAccountController = require("../controllers/collectionAccountController");

router.use(authenticate);

// Collection Accounts Routes
const viewPaymentAccounts = requirePermission([
  "payments.view",
  "accounting.view",
  "ops.view",
]);
const managePaymentAccounts = requirePermission([
  "station_payments.manage_accounts",
  "payments.edit",
  "accounting.approve",
]);

router.get("/accounts", viewPaymentAccounts, collectionAccountController.getAccounts);
router.post(
  "/accounts",
  managePaymentAccounts,
  collectionAccountController.createAccount,
);
router.put(
  "/accounts/:id",
  managePaymentAccounts,
  collectionAccountController.updateAccount,
);
router.delete(
  "/accounts/:id",
  managePaymentAccounts,
  collectionAccountController.deleteAccount,
);
router.get(
  "/accounts/:id/ledger",
  viewPaymentAccounts,
  collectionAccountController.getAccountLedger,
);
router.post(
  "/accounts/:id/submit",
  requirePermission(["ops.manage", "payments.edit", "accounting.approve"]),
  collectionAccountController.recordAccountSubmission,
);
router.post("/accounts/transfer", requirePermission("ops.manage"), collectionAccountController.recordAccountSubmission);
router.post("/sync-treasury-mappings", requirePermission("ops.manage"), syncTreasuryMappings);

// Global Payables Queue & Recorded Payments
router.get("/vendor-payables-queue", requirePermission("ops.view"), getAllVendorPayablesQueue);
router.get("/vendor-payments", requirePermission("ops.view"), getAllRecordedVendorPayments);

// Finance Controller Verification Queue & Riya Wallet Portal
router.get("/verification-queue", requirePermission("ops.view"), getFinanceVerificationQueue);
router.get("/riya-summary", requirePermission("ops.view"), getRiyaSummary);

// Client Receivables Routes
router.get("/client/:tripId", requirePermission("ops.view"), getClientPayments);
router.post(
  "/client/add/:bookingId",
  requirePermission("ops.manage"),
  addClientPayment,
);
router.patch(
  "/client/verify/:id",
  requirePermission("ops.manage"),
  verifyClientPayment,
);
router.patch(
  "/client/:id/account",
  requirePermission("ops.manage"),
  updatePaymentAccount,
);
router.get(
  "/booking/:bookingId",
  requirePermission(["payments.view", "bookings.view", "ops.view"]),
  getBookingPayments,
);

// Vendor Payables Routes
router.get("/vendor/:tripId", requirePermission("ops.view"), getVendorPayments);
router.post(
  "/vendor/:tripId",
  requirePermission("ops.manage"),
  createVendorPayment,
);
router.put(
  "/vendor/:tripId/:id",
  requirePermission("ops.manage"),
  updateVendorPayment,
);
router.patch(
  "/vendor/verify/:id",
  requirePermission("ops.manage"),
  verifyVendorPayment,
);
router.delete(
  "/vendor/:id",
  requirePermission("ops.manage"),
  deleteVendorPayment,
);

// Financial Dashboard stats
router.get(
  "/dashboard/:tripId",
  requirePermission("ops.view"),
  getPaymentsDashboardStats,
);

module.exports = router;

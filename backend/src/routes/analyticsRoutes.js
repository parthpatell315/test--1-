const express = require("express");
const router = express.Router();
const analyticsController = require("../controllers/analyticsController");
const { authenticate } = require("../middleware/auth");

router.get("/realtime", authenticate, analyticsController.getRealtime);
router.get("/overview", authenticate, analyticsController.getOverview);

module.exports = router;

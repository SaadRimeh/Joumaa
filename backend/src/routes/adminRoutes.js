const express = require("express");
const {
  getDashboardStatsController,
  getLiveFeed,
  getPriceSettings,
  updatePrice,
  getPriceHistory,
  createEmployee,
  listEmployees,
  getEmployeeDetails,
  updateEmployeeStatus,
  deleteEmployee,
  getEmployeeDistributions,
  listMerchants,
  createMerchant,
} = require("../controllers/adminController");
const {
  getDailyReportController,
  getEmployeePerformanceReportController,
  getMerchantReportController,
  exportReportController,
  sendWhatsAppReportController,
} = require("../controllers/reportController");
const { authorize, protect } = require("../middlewares/auth");

const router = express.Router();

router.use(protect, authorize("admin"));

router.get("/dashboard/stats", getDashboardStatsController);
router.get("/dashboard/live-feed", getLiveFeed);

router.get("/price", getPriceSettings);
router.patch("/price", updatePrice);
router.get("/price/history", getPriceHistory);

router.post("/employees", createEmployee);
router.get("/employees", listEmployees);
router.get("/employees/:employeeId", getEmployeeDetails);
router.delete("/employees/:employeeId", deleteEmployee);
router.patch("/employees/:employeeId/status", updateEmployeeStatus);
router.get("/employees/:employeeId/distributions", getEmployeeDistributions);

router.get("/merchants", listMerchants);
router.post("/merchants", createMerchant);

router.get("/reports/daily", getDailyReportController);
router.get("/reports/employees", getEmployeePerformanceReportController);
router.get("/reports/merchants", getMerchantReportController);
router.get("/reports/export", exportReportController);
router.post("/reports/send-whatsapp", sendWhatsAppReportController);

module.exports = router;

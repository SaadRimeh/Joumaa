const express = require("express");
const {
  getEmployeeDashboard,
  receiveStock,
  createDistribution,
  getDistributionHistory,
  getInventoryStatus,
  listEmployeeMerchants,
  addMerchant,
} = require("../controllers/employeeController");
const { authorize, protect } = require("../middlewares/auth");

const router = express.Router();

router.use(protect, authorize("employee"));

router.get("/dashboard", getEmployeeDashboard);
router.get("/inventory", getInventoryStatus);

router.post("/receivings", receiveStock);

router.post("/distributions", createDistribution);
router.get("/distributions", getDistributionHistory);

router.get("/merchants", listEmployeeMerchants);
router.post("/merchants", addMerchant);

module.exports = router;

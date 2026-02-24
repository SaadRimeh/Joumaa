const Admin = require("../models/Admin");
const Distribution = require("../models/Distribution");
const Employee = require("../models/Employee");
const { getDayRange } = require("../utils/dateUtils");

async function getDashboardStats(dateInput = new Date()) {
  const { start, end } = getDayRange(dateInput);

  const [activeEmployees, stockTotals, todayTotals, admin] = await Promise.all([
    Employee.countDocuments({ isActive: true }),
    Employee.aggregate([
      {
        $group: {
          _id: null,
          totalAvailableStock: { $sum: "$currentStock" },
        },
      },
    ]),
    Distribution.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          todayDistributedQuantity: { $sum: "$quantity" },
          todaySales: { $sum: "$totalAmount" },
        },
      },
    ]),
    Admin.findOne().select("currentKiloPrice"),
  ]);

  return {
    activeEmployees,
    totalAvailableStock: stockTotals[0]?.totalAvailableStock || 0,
    todayDistributedQuantity: todayTotals[0]?.todayDistributedQuantity || 0,
    todaySales: todayTotals[0]?.todaySales || 0,
    currentKiloPrice: admin?.currentKiloPrice || 0,
  };
}

module.exports = {
  getDashboardStats,
};

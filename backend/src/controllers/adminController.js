const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const Distribution = require("../models/Distribution");
const Employee = require("../models/Employee");
const Merchant = require("../models/Merchant");
const PriceHistory = require("../models/PriceHistory");
const Receiving = require("../models/Receiving");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const generateEmployeeCode = require("../utils/generateEmployeeCode");
const { getCustomRange, getPeriodRange } = require("../utils/dateUtils");
const { getDashboardStats } = require("../services/statsService");
const {
  emitPriceUpdated,
  emitEmployeeSessionRevoked,
  emitEmployeeStatusUpdated,
  broadcastAdminStatsUpdate,
} = require("../services/realtimeService");
const { logAction } = require("../services/auditService");

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

async function getAdminSupportContact(adminId) {
  const admin = await Admin.findById(adminId).select("name phone").lean();
  return {
    name: admin?.name || "الاستاذ جمعة",
    phone: admin?.phone || "",
  };
}

const getDashboardStatsController = asyncHandler(async (req, res) => {
  const stats = await getDashboardStats();
  res.status(200).json({
    success: true,
    data: stats,
  });
});

const getLiveFeed = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);

  const distributions = await Distribution.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("employeeId", "name phone car")
    .populate("merchantId", "name phone shopName");

  res.status(200).json({
    success: true,
    data: distributions,
  });
});

const getPriceSettings = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.user.adminId).select("currentKiloPrice updatedAt");
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  res.status(200).json({
    success: true,
    data: {
      currentKiloPrice: admin.currentKiloPrice,
      updatedAt: admin.updatedAt,
    },
  });
});

const updatePrice = asyncHandler(async (req, res) => {
  const price = Number(req.body.price);
  if (!Number.isFinite(price) || price <= 0) {
    throw new ApiError(400, "price must be a positive number");
  }

  const admin = await Admin.findById(req.user.adminId);
  if (!admin) {
    throw new ApiError(404, "Admin not found");
  }

  const oldPrice = admin.currentKiloPrice;
  admin.currentKiloPrice = price;
  await admin.save();

  const history = await PriceHistory.create({
    oldPrice,
    newPrice: price,
    changedBy: admin._id,
  });

  emitPriceUpdated({
    oldPrice,
    newPrice: price,
    changedAt: history.createdAt,
  });
  await broadcastAdminStatsUpdate();

  await logAction({
    actorRole: "admin",
    actorId: req.user.adminId,
    action: "PRICE_UPDATED",
    entityType: "Admin",
    entityId: admin._id,
    payload: {
      oldPrice,
      newPrice: price,
    },
  });

  res.status(200).json({
    success: true,
    data: {
      oldPrice,
      newPrice: price,
      updatedAt: admin.updatedAt,
    },
  });
});

const getPriceHistory = asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  const rows = await PriceHistory.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("changedBy", "name phone");

  res.status(200).json({
    success: true,
    data: rows,
  });
});

const createEmployee = asyncHandler(async (req, res) => {
  const { name, phone, car } = req.body;

  if (!name || !phone || !car) {
    throw new ApiError(400, "name, phone and car are required");
  }

  const uniqueCode = await generateEmployeeCode(Employee);

  const employee = await Employee.create({
    name: String(name).trim(),
    phone: String(phone).trim(),
    car: String(car).trim(),
    uniqueCode,
    createdBy: req.user.adminId,
  });

  await logAction({
    actorRole: "admin",
    actorId: req.user.adminId,
    action: "EMPLOYEE_CREATED",
    entityType: "Employee",
    entityId: employee._id,
    payload: {
      name: employee.name,
      phone: employee.phone,
      car: employee.car,
      uniqueCode: employee.uniqueCode,
    },
  });

  await broadcastAdminStatsUpdate();

  res.status(201).json({
    success: true,
    data: employee,
  });
});

const listEmployees = asyncHandler(async (req, res) => {
  const { search, isActive } = req.query;
  const filters = {};

  if (isActive === "true" || isActive === "false") {
    filters.isActive = isActive === "true";
  }

  if (search) {
    const regex = new RegExp(search, "i");
    filters.$or = [{ name: regex }, { phone: regex }, { car: regex }, { uniqueCode: regex }];
  }

  const employees = await Employee.find(filters).sort({ createdAt: -1 }).lean();

  res.status(200).json({
    success: true,
    data: employees,
  });
});

const getEmployeeDetails = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  if (!isValidObjectId(employeeId)) {
    throw new ApiError(400, "Invalid employeeId");
  }

  const employee = await Employee.findById(employeeId).lean();
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  const [distributions, receivings] = await Promise.all([
    Distribution.find({ employeeId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("merchantId", "name phone shopName"),
    Receiving.find({ employeeId }).sort({ createdAt: -1 }).limit(100),
  ]);

  res.status(200).json({
    success: true,
    data: {
      employee,
      distributions,
      receivings,
    },
  });
});

const updateEmployeeStatus = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { isActive } = req.body;

  if (!isValidObjectId(employeeId)) {
    throw new ApiError(400, "Invalid employeeId");
  }

  if (typeof isActive !== "boolean") {
    throw new ApiError(400, "isActive must be a boolean");
  }

  const employee = await Employee.findByIdAndUpdate(
    employeeId,
    { isActive },
    { new: true, runValidators: true }
  );

  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  await logAction({
    actorRole: "admin",
    actorId: req.user.adminId,
    action: "EMPLOYEE_STATUS_UPDATED",
    entityType: "Employee",
    entityId: employee._id,
    payload: { isActive },
  });

  const supportContact = await getAdminSupportContact(req.user.adminId);
  emitEmployeeStatusUpdated({
    employeeId: employee._id.toString(),
    employeeName: employee.name,
    isActive: employee.isActive,
    adminName: supportContact.name,
    adminPhone: supportContact.phone,
    message: employee.isActive
      ? "تم تفعيل حسابك من جديد ويمكنك متابعة العمل."
      : `تم إيقافك مؤقتاً، يرجى الاتصال مع ${supportContact.name}${
          supportContact.phone ? ` على الرقم ${supportContact.phone}` : ""
        }`,
  });

  await broadcastAdminStatsUpdate();

  res.status(200).json({
    success: true,
    data: employee,
  });
});

const deleteEmployee = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;

  if (!isValidObjectId(employeeId)) {
    throw new ApiError(400, "Invalid employeeId");
  }

  const employee = await Employee.findById(employeeId);
  if (!employee) {
    throw new ApiError(404, "Employee not found");
  }

  const [hasDistributions, hasReceivings] = await Promise.all([
    Distribution.exists({ employeeId: employee._id }),
    Receiving.exists({ employeeId: employee._id }),
  ]);

  if (hasDistributions || hasReceivings) {
    throw new ApiError(
      400,
      "Cannot delete employee with recorded operations. Deactivate instead."
    );
  }

  await employee.deleteOne();

  await logAction({
    actorRole: "admin",
    actorId: req.user.adminId,
    action: "EMPLOYEE_DELETED",
    entityType: "Employee",
    entityId: employee._id,
    payload: {
      name: employee.name,
      phone: employee.phone,
      uniqueCode: employee.uniqueCode,
    },
  });

  emitEmployeeSessionRevoked({
    employeeId: employee._id.toString(),
    employeeName: employee.name,
    message: "تم حذف حسابك من النظام من قبل الادمن. تم تسجيل خروجك.",
  });

  await broadcastAdminStatsUpdate();

  res.status(200).json({
    success: true,
    data: {
      employeeId: employee._id,
    },
  });
});

const getEmployeeDistributions = asyncHandler(async (req, res) => {
  const { employeeId } = req.params;
  const { period, from, to } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  if (!isValidObjectId(employeeId)) {
    throw new ApiError(400, "Invalid employeeId");
  }

  const employeeObjectId = new mongoose.Types.ObjectId(employeeId);
  const query = { employeeId: employeeObjectId };

  if (period) {
    const { start, end } = getPeriodRange(period, new Date());
    query.createdAt = { $gte: start, $lt: end };
  } else {
    const range = getCustomRange(from, to);
    if (range) {
      query.createdAt = { $gte: range.start, $lt: range.end };
    }
  }

  const [rows, totals] = await Promise.all([
    Distribution.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("merchantId", "name phone shopName"),
    Distribution.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          totalSales: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totals: {
        totalQuantity: totals[0]?.totalQuantity || 0,
        totalSales: totals[0]?.totalSales || 0,
        totalTransactions: totals[0]?.totalTransactions || 0,
      },
      rows,
    },
  });
});

const listMerchants = asyncHandler(async (req, res) => {
  const { search } = req.query;
  const limit = Math.min(Math.max(Number(req.query.limit) || 200, 1), 1000);

  const filters = {};
  if (search) {
    const regex = new RegExp(search, "i");
    filters.$or = [{ name: regex }, { phone: regex }, { shopName: regex }];
  }

  const merchants = await Merchant.find(filters).sort({ totalReceived: -1 }).limit(limit);

  res.status(200).json({
    success: true,
    data: merchants,
  });
});

const createMerchant = asyncHandler(async (req, res) => {
  const { name, phone, shopName, location } = req.body;
  if (!name) {
    throw new ApiError(400, "Merchant name is required");
  }

  const merchant = await Merchant.create({
    name: String(name).trim(),
    phone: phone ? String(phone).trim() : "",
    shopName: shopName ? String(shopName).trim() : "",
    location: location ? String(location).trim() : "",
  });

  await logAction({
    actorRole: "admin",
    actorId: req.user.adminId,
    action: "MERCHANT_CREATED",
    entityType: "Merchant",
    entityId: merchant._id,
    payload: {
      name: merchant.name,
      phone: merchant.phone,
      shopName: merchant.shopName,
    },
  });

  res.status(201).json({
    success: true,
    data: merchant,
  });
});

module.exports = {
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
};

const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const Distribution = require("../models/Distribution");
const Employee = require("../models/Employee");
const Merchant = require("../models/Merchant");
const Receiving = require("../models/Receiving");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { getCustomRange, getPeriodRange } = require("../utils/dateUtils");
const { logAction } = require("../services/auditService");
const {
  emitDistributionCreated,
  emitLowStockAlert,
  emitReceivingCreated,
  broadcastAdminStatsUpdate,
} = require("../services/realtimeService");

function normalizePaymentStatus(rawStatus) {
  if (!rawStatus) {
    return "paid";
  }

  const status = String(rawStatus).trim().toLowerCase();
  const map = {
    paid: "paid",
    credit: "credit",
    partial: "partial",
    "مدفوع": "paid",
    "اجل": "credit",
    "آجل": "credit",
    "جزئي": "partial",
  };
  return map[status] || "paid";
}

function isValidObjectId(value) {
  return mongoose.Types.ObjectId.isValid(value);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeLocation(location) {
  if (!location || typeof location !== "object") {
    return undefined;
  }

  const lat = Number(location.lat);
  const lng = Number(location.lng);
  const address = location.address ? String(location.address).trim() : undefined;

  const safeLocation = {};
  if (Number.isFinite(lat)) {
    safeLocation.lat = lat;
  }
  if (Number.isFinite(lng)) {
    safeLocation.lng = lng;
  }
  if (address) {
    safeLocation.address = address;
  }

  return Object.keys(safeLocation).length ? safeLocation : undefined;
}

let transactionSupportCache = null;

async function canUseTransactions() {
  if (typeof transactionSupportCache === "boolean") {
    return transactionSupportCache;
  }

  if (!mongoose.connection?.db) {
    return false;
  }

  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 });
    transactionSupportCache = Boolean(hello.setName || hello.msg === "isdbgrid");
  } catch (error) {
    return false;
  }

  return transactionSupportCache;
}

function throwEmployeeSessionRevoked() {
  throw new ApiError(401, "Your account has been removed by admin. Session revoked.", {
    code: "EMPLOYEE_SESSION_REVOKED",
    details: { reason: "deleted" },
  });
}

async function getSupportContact() {
  const admin = await Admin.findOne().select("name phone").lean();
  return {
    name: admin?.name || "الاستاذ جمعة",
    phone: admin?.phone || "",
  };
}

function buildSuspendedMessage(supportContact) {
  return `انت تم ايقافك مؤقتا، يرجى الاتصال مع ${supportContact.name}${
    supportContact.phone ? ` على الرقم ${supportContact.phone}` : ""
  }`;
}

async function ensureEmployeeCanOperate(employee) {
  if (!employee.isActive) {
    const supportContact = await getSupportContact();
    throw new ApiError(403, buildSuspendedMessage(supportContact), {
      code: "EMPLOYEE_SUSPENDED",
      details: {
        adminName: supportContact.name,
        adminPhone: supportContact.phone,
      },
    });
  }
}

const getEmployeeDashboard = asyncHandler(async (req, res) => {
  const [employee, admin, lastDistributions] = await Promise.all([
    Employee.findById(req.user.employeeId),
    Admin.findOne().select("name phone currentKiloPrice"),
    Distribution.find({ employeeId: req.user.employeeId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("merchantId", "name phone shopName"),
  ]);

  if (!employee) {
    throwEmployeeSessionRevoked();
  }

  const lowStockThreshold = Math.max(10, Math.floor(Math.max(employee.totalReceived, 0) * 0.1));
  const isLowStock = employee.currentStock <= lowStockThreshold;

  res.status(200).json({
    success: true,
    data: {
      profile: {
        id: employee._id,
        name: employee.name,
        phone: employee.phone,
        car: employee.car,
        uniqueCode: employee.uniqueCode,
        isActive: employee.isActive,
      },
      indicators: {
        totalReceived: employee.totalReceived,
        totalDistributed: employee.totalDistributed,
        currentStock: employee.currentStock,
        currentKiloPrice: admin?.currentKiloPrice || 0,
        lowStockThreshold,
        isLowStock,
      },
      supportContact: {
        name: admin?.name || "الاستاذ جمعة",
        phone: admin?.phone || "",
      },
      lastDistributions,
    },
  });
});

const receiveStock = asyncHandler(async (req, res) => {
  const quantity = Number(req.body.quantity);
  const notes = req.body.notes ? String(req.body.notes).trim() : "";

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(400, "quantity must be a positive number");
  }

  const useTransaction = await canUseTransactions();
  const session = useTransaction ? await mongoose.startSession() : null;
  let receivingRecord;
  let updatedEmployee;

  try {
    if (session) {
      session.startTransaction();
    }

    const employeeQuery = Employee.findById(req.user.employeeId);
    if (session) {
      employeeQuery.session(session);
    }
    const employee = await employeeQuery;
    if (!employee) {
      throwEmployeeSessionRevoked();
    }
    await ensureEmployeeCanOperate(employee);

    const stockBefore = employee.currentStock;
    const stockAfter = stockBefore + quantity;

    employee.currentStock = stockAfter;
    employee.totalReceived += quantity;
    if (session) {
      await employee.save({ session });
      [receivingRecord] = await Receiving.create(
        [
          {
            employeeId: employee._id,
            quantity,
            stockBefore,
            stockAfter,
            notes,
          },
        ],
        { session }
      );
      await session.commitTransaction();
    } else {
      await employee.save();
      receivingRecord = await Receiving.create({
        employeeId: employee._id,
        quantity,
        stockBefore,
        stockAfter,
        notes,
      });
    }

    updatedEmployee = employee;
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }

  const payload = await Receiving.findById(receivingRecord._id).populate(
    "employeeId",
    "name phone car"
  );

  emitReceivingCreated(payload);
  await broadcastAdminStatsUpdate();

  await logAction({
    actorRole: "employee",
    actorId: req.user.employeeId,
    action: "RECEIVING_CREATED",
    entityType: "Receiving",
    entityId: receivingRecord._id,
    payload: {
      quantity,
      stockAfter: updatedEmployee.currentStock,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      receiving: payload,
      currentStock: updatedEmployee.currentStock,
      totalReceived: updatedEmployee.totalReceived,
    },
  });
});

const createDistribution = asyncHandler(async (req, res) => {
  const {
    merchantId,
    merchantName,
    merchantPhone,
    shopName,
    merchantLocation,
    quantity: rawQuantity,
    paymentStatus,
    notes,
    location,
  } = req.body;

  const quantity = Number(rawQuantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new ApiError(400, "quantity must be a positive number");
  }

  if (!merchantId && !merchantName) {
    throw new ApiError(400, "merchantName is required when merchantId is not provided");
  }

  if (merchantId && !isValidObjectId(merchantId)) {
    throw new ApiError(400, "Invalid merchantId");
  }

  const useTransaction = await canUseTransactions();
  const session = useTransaction ? await mongoose.startSession() : null;

  let distributionRecord;
  let stockAfter = 0;
  let stockBefore = 0;
  let employeeId;
  let lowStockAlert = false;

  try {
    if (session) {
      session.startTransaction();
    }

    const employeeQuery = Employee.findById(req.user.employeeId);
    const adminQuery = Admin.findOne().select("currentKiloPrice");
    if (session) {
      employeeQuery.session(session);
      adminQuery.session(session);
    }

    const [employee, admin] = await Promise.all([employeeQuery, adminQuery]);

    if (!employee) {
      throwEmployeeSessionRevoked();
    }
    await ensureEmployeeCanOperate(employee);
    if (!admin) {
      throw new ApiError(500, "Admin profile is not configured");
    }

    stockBefore = employee.currentStock;
    if (quantity > stockBefore) {
      throw new ApiError(400, "Distributed quantity cannot exceed current stock");
    }

    let merchant = null;
    if (merchantId) {
      const merchantByIdQuery = Merchant.findById(merchantId);
      if (session) {
        merchantByIdQuery.session(session);
      }
      merchant = await merchantByIdQuery;
      if (!merchant) {
        throw new ApiError(404, "Merchant not found");
      }
    } else {
      const merchantQuery = { name: String(merchantName).trim() };
      if (merchantPhone) {
        merchantQuery.phone = String(merchantPhone).trim();
      }

      const existingMerchantQuery = Merchant.findOne(merchantQuery);
      if (session) {
        existingMerchantQuery.session(session);
      }
      merchant = await existingMerchantQuery;
      if (!merchant) {
        const merchantPayload = {
          name: merchantQuery.name,
          phone: merchantPhone ? String(merchantPhone).trim() : "",
          shopName: shopName ? String(shopName).trim() : "",
          location: merchantLocation ? String(merchantLocation).trim() : "",
          createdByEmployee: employee._id,
        };
        if (session) {
          [merchant] = await Merchant.create([merchantPayload], { session });
        } else {
          merchant = await Merchant.create(merchantPayload);
        }
      } else {
        if (shopName && !merchant.shopName) {
          merchant.shopName = String(shopName).trim();
        }
        if (merchantLocation && !merchant.location) {
          merchant.location = String(merchantLocation).trim();
        }
      }
    }

    stockAfter = stockBefore - quantity;
    const kiloPrice = admin.currentKiloPrice || 0;
    const totalAmount = quantity * kiloPrice;

    const distributionPayload = {
      employeeId: employee._id,
      merchantId: merchant._id,
      merchantName: merchant.name,
      quantity,
      pricePerKilo: kiloPrice,
      totalAmount,
      employeeStockBefore: stockBefore,
      employeeStockAfter: stockAfter,
      paymentStatus: normalizePaymentStatus(paymentStatus),
      notes: notes ? String(notes).trim() : "",
      location: sanitizeLocation(location),
    };
    if (session) {
      [distributionRecord] = await Distribution.create([distributionPayload], { session });
    } else {
      distributionRecord = await Distribution.create(distributionPayload);
    }

    employee.currentStock = stockAfter;
    employee.totalDistributed += quantity;
    if (session) {
      await employee.save({ session });
    } else {
      await employee.save();
    }

    merchant.totalReceived += quantity;
    merchant.transactions.push({
      distributionId: distributionRecord._id,
      quantity,
      totalAmount,
      createdAt: new Date(),
    });
    if (merchant.transactions.length > 300) {
      merchant.transactions = merchant.transactions.slice(-300);
    }
    if (session) {
      await merchant.save({ session });
    } else {
      await merchant.save();
    }

    lowStockAlert = stockAfter <= Math.max(10, Math.floor(stockBefore * 0.1));
    employeeId = employee._id.toString();

    if (session) {
      await session.commitTransaction();
    }
  } catch (error) {
    if (session?.inTransaction()) {
      await session.abortTransaction();
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }

  const payload = await Distribution.findById(distributionRecord._id)
    .populate("employeeId", "name phone car")
    .populate("merchantId", "name phone shopName");

  emitDistributionCreated(payload);

  if (lowStockAlert) {
    emitLowStockAlert({
      employeeId,
      currentStock: stockAfter,
      message: "المخزون أقل من حد 10%",
    });
  }

  await broadcastAdminStatsUpdate();

  await logAction({
    actorRole: "employee",
    actorId: req.user.employeeId,
    action: "DISTRIBUTION_CREATED",
    entityType: "Distribution",
    entityId: distributionRecord._id,
    payload: {
      quantity,
      stockBefore,
      stockAfter,
      merchantId: payload.merchantId?._id || null,
      totalAmount: payload.totalAmount,
    },
  });

  res.status(201).json({
    success: true,
    data: {
      distribution: payload,
      lowStockAlert,
      currentStock: stockAfter,
    },
  });
});

const getDistributionHistory = asyncHandler(async (req, res) => {
  const { period, from, to, merchantId, merchantName } = req.query;
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200);
  const skip = (page - 1) * limit;

  const employeeObjectId = new mongoose.Types.ObjectId(req.user.employeeId);
  const query = { employeeId: employeeObjectId };

  if (period) {
    const { start, end } = getPeriodRange(period, new Date());
    query.createdAt = { $gte: start, $lt: end };
  } else {
    const customRange = getCustomRange(from, to);
    if (customRange) {
      query.createdAt = { $gte: customRange.start, $lt: customRange.end };
    }
  }

  if (merchantId) {
    if (!isValidObjectId(merchantId)) {
      throw new ApiError(400, "Invalid merchantId");
    }
    query.merchantId = merchantId;
  }

  if (merchantName) {
    query.merchantName = new RegExp(escapeRegExp(String(merchantName).trim()), "i");
  }

  const [rows, count, totalsAgg] = await Promise.all([
    Distribution.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("merchantId", "name phone shopName"),
    Distribution.countDocuments(query),
    Distribution.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalQuantity: { $sum: "$quantity" },
          totalAmount: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 },
        },
      },
    ]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      page,
      limit,
      totalRows: count,
      totalPages: Math.ceil(count / limit),
      totals: {
        totalQuantity: totalsAgg[0]?.totalQuantity || 0,
        totalAmount: totalsAgg[0]?.totalAmount || 0,
        totalTransactions: totalsAgg[0]?.totalTransactions || 0,
      },
      rows,
    },
  });
});

const getInventoryStatus = asyncHandler(async (req, res) => {
  const employee = await Employee.findById(req.user.employeeId);
  if (!employee) {
    throwEmployeeSessionRevoked();
  }

  const threshold = Math.max(10, Math.floor(Math.max(employee.totalReceived, 0) * 0.1));
  const isLowStock = employee.currentStock <= threshold;

  res.status(200).json({
    success: true,
    data: {
      employeeId: employee._id,
      currentStock: employee.currentStock,
      totalReceived: employee.totalReceived,
      totalDistributed: employee.totalDistributed,
      lowStockThreshold: threshold,
      isLowStock,
      recommendedAction: isLowStock
        ? "اطلب استلاماً جديداً من المدجنة"
        : "المخزون كافٍ حالياً",
    },
  });
});

const listEmployeeMerchants = asyncHandler(async (req, res) => {
  const search = req.query.search ? String(req.query.search).trim() : "";
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 500);

  const match = {
    employeeId: new mongoose.Types.ObjectId(req.user.employeeId),
  };

  if (search) {
    match.merchantName = new RegExp(escapeRegExp(search), "i");
  }

  const rows = await Distribution.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$merchantId",
        merchantName: { $first: "$merchantName" },
        totalQuantity: { $sum: "$quantity" },
        totalSales: { $sum: "$totalAmount" },
        totalTransactions: { $sum: 1 },
        lastDistributionAt: { $max: "$createdAt" },
      },
    },
    {
      $lookup: {
        from: "merchants",
        localField: "_id",
        foreignField: "_id",
        as: "merchant",
      },
    },
    {
      $unwind: {
        path: "$merchant",
        preserveNullAndEmptyArrays: true,
      },
    },
    {
      $project: {
        _id: 0,
        merchantId: "$_id",
        merchantName: {
          $ifNull: ["$merchantName", { $ifNull: ["$merchant.name", "Unknown"] }],
        },
        phone: { $ifNull: ["$merchant.phone", ""] },
        shopName: { $ifNull: ["$merchant.shopName", ""] },
        totalQuantity: 1,
        totalSales: 1,
        totalTransactions: 1,
        lastDistributionAt: 1,
      },
    },
    { $sort: { totalQuantity: -1 } },
    { $limit: limit },
  ]);

  res.status(200).json({
    success: true,
    data: rows,
  });
});

const addMerchant = asyncHandler(async (req, res) => {
  const { name, phone, shopName, location } = req.body;
  if (!name) {
    throw new ApiError(400, "Merchant name is required");
  }

  const employee = await Employee.findById(req.user.employeeId).select("isActive");
  if (!employee) {
    throwEmployeeSessionRevoked();
  }
  await ensureEmployeeCanOperate(employee);

  const merchant = await Merchant.create({
    name: String(name).trim(),
    phone: phone ? String(phone).trim() : "",
    shopName: shopName ? String(shopName).trim() : "",
    location: location ? String(location).trim() : "",
    createdByEmployee: req.user.employeeId,
  });

  await logAction({
    actorRole: "employee",
    actorId: req.user.employeeId,
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
  getEmployeeDashboard,
  receiveStock,
  createDistribution,
  getDistributionHistory,
  getInventoryStatus,
  listEmployeeMerchants,
  addMerchant,
};

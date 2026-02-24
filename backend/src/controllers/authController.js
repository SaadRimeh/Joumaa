const jwt = require("jsonwebtoken");
const Admin = require("../models/Admin");
const Employee = require("../models/Employee");
const ApiError = require("../utils/apiError");
const asyncHandler = require("../utils/asyncHandler");
const { JWT_SECRET, JWT_EXPIRES_IN } = require("../config/env");

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

const login = asyncHandler(async (req, res) => {
  const { loginType, phone, password, code, name } = req.body;

  if (loginType === "admin") {
    if ((!phone && !name) || !password) {
      throw new ApiError(400, "Admin login requires password and phone or name");
    }

    const query = phone ? { phone } : { name };
    const admin = await Admin.findOne(query).select("+password");

    if (!admin) {
      throw new ApiError(401, "Invalid admin credentials");
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      throw new ApiError(401, "Invalid admin credentials");
    }

    const token = signToken({
      role: "admin",
      adminId: admin._id.toString(),
      phone: admin.phone,
      name: admin.name,
    });

    return res.status(200).json({
      success: true,
      data: {
        role: "admin",
        token,
        admin: {
          id: admin._id,
          name: admin.name,
          phone: admin.phone,
          currentKiloPrice: admin.currentKiloPrice,
        },
      },
    });
  }

  if (loginType === "employee") {
    if (!code) {
      throw new ApiError(400, "Employee login requires unique code");
    }

    const employee = await Employee.findOne({ uniqueCode: code, isActive: true });
    if (!employee) {
      throw new ApiError(401, "Invalid or inactive employee code");
    }

    employee.lastLoginAt = new Date();
    await employee.save();

    const admin = await Admin.findOne().select("currentKiloPrice");

    const token = signToken({
      role: "employee",
      employeeId: employee._id.toString(),
      name: employee.name,
    });

    return res.status(200).json({
      success: true,
      data: {
        role: "employee",
        token,
        employee: {
          id: employee._id,
          name: employee.name,
          phone: employee.phone,
          car: employee.car,
          uniqueCode: employee.uniqueCode,
          currentStock: employee.currentStock,
          totalReceived: employee.totalReceived,
          totalDistributed: employee.totalDistributed,
          isActive: employee.isActive,
          currentKiloPrice: admin?.currentKiloPrice || 0,
        },
      },
    });
  }

  throw new ApiError(400, "Invalid loginType. Allowed values: admin, employee");
});

const me = asyncHandler(async (req, res) => {
  if (!req.user?.role) {
    throw new ApiError(401, "Unauthorized");
  }

  if (req.user.role === "admin") {
    const admin = await Admin.findById(req.user.adminId);
    if (!admin) {
      throw new ApiError(404, "Admin not found");
    }

    return res.status(200).json({
      success: true,
      data: {
        role: "admin",
        user: {
          id: admin._id,
          name: admin.name,
          phone: admin.phone,
          currentKiloPrice: admin.currentKiloPrice,
          createdAt: admin.createdAt,
        },
      },
    });
  }

  if (req.user.role === "employee") {
    const [employee, admin] = await Promise.all([
      Employee.findById(req.user.employeeId),
      Admin.findOne().select("currentKiloPrice"),
    ]);

    if (!employee) {
      throw new ApiError(401, "Your account has been removed by admin. Session revoked.", {
        code: "EMPLOYEE_SESSION_REVOKED",
        details: { reason: "deleted" },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        role: "employee",
        user: {
          id: employee._id,
          name: employee.name,
          phone: employee.phone,
          car: employee.car,
          uniqueCode: employee.uniqueCode,
          currentStock: employee.currentStock,
          totalReceived: employee.totalReceived,
          totalDistributed: employee.totalDistributed,
          isActive: employee.isActive,
          currentKiloPrice: admin?.currentKiloPrice || 0,
          createdAt: employee.createdAt,
        },
      },
    });
  }

  throw new ApiError(401, "Unauthorized");
});

module.exports = {
  login,
  me,
};

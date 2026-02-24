const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/env");
const Employee = require("../models/Employee");
const ApiError = require("../utils/apiError");

async function protect(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(new ApiError(401, "Unauthorized"));
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    if (payload.role === "employee" && payload.employeeId) {
      const employee = await Employee.findById(payload.employeeId).select("_id");
      if (!employee) {
        return next(
          new ApiError(401, "Your account has been removed by admin. Session revoked.", {
            code: "EMPLOYEE_SESSION_REVOKED",
            details: { reason: "deleted" },
          })
        );
      }
    }

    req.user = payload;
    return next();
  } catch (error) {
    return next(new ApiError(401, "Invalid or expired token"));
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ApiError(403, "Forbidden"));
    }
    return next();
  };
}

module.exports = {
  protect,
  authorize,
};

const { NODE_ENV } = require("../config/env");
const ApiError = require("../utils/apiError");

function notFound(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.originalUrl}`));
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (statusCode >= 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(err.code ? { code: err.code } : {}),
    ...(err.details ? { details: err.details } : {}),
    ...(NODE_ENV === "development" ? { stack: err.stack } : {}),
  });
}

module.exports = {
  notFound,
  errorHandler,
};

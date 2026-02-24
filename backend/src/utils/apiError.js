class ApiError extends Error {
  constructor(statusCode, message, options = {}) {
    super(message);
    this.statusCode = statusCode;
    this.name = "ApiError";
    this.code = options.code;
    this.details = options.details;
  }
}

module.exports = ApiError;

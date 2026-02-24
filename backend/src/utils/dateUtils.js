const ApiError = require("./apiError");

function parseDate(value, fallbackToNow = false) {
  if (!value && !fallbackToNow) {
    return null;
  }

  const parsed = value ? new Date(value) : new Date();
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDayRange(dateValue) {
  const date = parseDate(dateValue, true);
  if (!date) {
    throw new ApiError(400, "Invalid date value");
  }

  const start = new Date(date);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  return { start, end };
}

function getWeekRange(dateValue) {
  const date = parseDate(dateValue, true);
  if (!date) {
    throw new ApiError(400, "Invalid date value");
  }

  const start = new Date(date);
  const dayIndex = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dayIndex);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  return { start, end };
}

function getMonthRange(dateValue) {
  const date = parseDate(dateValue, true);
  if (!date) {
    throw new ApiError(400, "Invalid date value");
  }

  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  start.setHours(0, 0, 0, 0);

  const end = new Date(date.getFullYear(), date.getMonth() + 1, 1);
  end.setHours(0, 0, 0, 0);

  return { start, end };
}

function getPeriodRange(period, dateValue) {
  switch (period) {
    case "day":
      return getDayRange(dateValue);
    case "week":
      return getWeekRange(dateValue);
    case "month":
      return getMonthRange(dateValue);
    default:
      throw new ApiError(400, "Invalid period. Allowed values: day, week, month");
  }
}

function getCustomRange(fromValue, toValue) {
  const from = parseDate(fromValue);
  const to = parseDate(toValue);

  if (!from && !to) {
    return null;
  }

  if (from && to && from > to) {
    throw new ApiError(400, "Invalid date range: from is after to");
  }

  const start = from || new Date(0);
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

function formatIso(date) {
  return date.toISOString();
}

module.exports = {
  getDayRange,
  getWeekRange,
  getMonthRange,
  getPeriodRange,
  getCustomRange,
  formatIso,
};

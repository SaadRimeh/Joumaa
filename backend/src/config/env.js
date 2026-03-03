const dotenv = require("dotenv");

dotenv.config();

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toBoolean(value, fallback) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "n", "off"].includes(normalized)) {
    return false;
  }

  return fallback;
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: toNumber(process.env.PORT, 5000),
  KEEP_ALIVE_ENABLED: toBoolean(process.env.KEEP_ALIVE_ENABLED, false),
  KEEP_ALIVE_URL: process.env.KEEP_ALIVE_URL || "",
  KEEP_ALIVE_INTERVAL_MINUTES: toNumber(process.env.KEEP_ALIVE_INTERVAL_MINUTES, 4),
  MONGO_URI: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/joumaa",
  JWT_SECRET: process.env.JWT_SECRET || "replace-this-jwt-secret",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  ADMIN_NAME: process.env.ADMIN_NAME || "جمعة",
  ADMIN_PHONE: process.env.ADMIN_PHONE || "0940439962",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "aziz0940439962",
  DEFAULT_KILO_PRICE: toNumber(process.env.DEFAULT_KILO_PRICE, 2000),
  WHATSAPP_ACCESS_TOKEN: process.env.WHATSAPP_ACCESS_TOKEN || "",
  WHATSAPP_PHONE_NUMBER_ID: process.env.WHATSAPP_PHONE_NUMBER_ID || "",
  WHATSAPP_API_VERSION: process.env.WHATSAPP_API_VERSION || "v21.0",
};

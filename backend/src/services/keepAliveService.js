const axios = require("axios");
const { KEEP_ALIVE_ENABLED, KEEP_ALIVE_INTERVAL_MINUTES, KEEP_ALIVE_URL } = require("../config/env");

function normalizeUrl(value) {
  if (!value || typeof value !== "string") {
    return null;
  }

  try {
    return new URL(value).toString();
  } catch {
    return null;
  }
}

function startKeepAlive() {
  if (!KEEP_ALIVE_ENABLED) {
    return null;
  }

  const url = normalizeUrl(KEEP_ALIVE_URL);
  if (!url) {
    console.warn("[keep-alive] KEEP_ALIVE_URL is missing or invalid. Skipping keep-alive ping.");
    return null;
  }

  const intervalMinutes = Math.max(1, Number(KEEP_ALIVE_INTERVAL_MINUTES) || 4);
  const intervalMs = intervalMinutes * 60 * 1000;

  async function ping() {
    try {
      const response = await axios.get(url, {
        timeout: 10_000,
        validateStatus: () => true,
      });

      if (response.status < 200 || response.status >= 300) {
        console.warn(`[keep-alive] Ping responded with status ${response.status}`);
      }
    } catch (error) {
      console.warn("[keep-alive] Ping failed:", error?.message || error);
    }
  }

  ping();

  const timer = setInterval(ping, intervalMs);
  timer.unref?.();

  console.log(`[keep-alive] Pinging ${url} every ${intervalMinutes} minute(s).`);

  return timer;
}

module.exports = {
  startKeepAlive,
};


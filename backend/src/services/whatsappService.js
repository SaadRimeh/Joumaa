const axios = require("axios");
const ApiError = require("../utils/apiError");
const {
  WHATSAPP_ACCESS_TOKEN,
  WHATSAPP_PHONE_NUMBER_ID,
  WHATSAPP_API_VERSION,
} = require("../config/env");

function isWhatsAppConfigured() {
  return Boolean(WHATSAPP_ACCESS_TOKEN && WHATSAPP_PHONE_NUMBER_ID);
}

async function sendWhatsAppText({ to, body }) {
  if (!isWhatsAppConfigured()) {
    throw new ApiError(
      400,
      "WhatsApp is not configured. Set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID"
    );
  }

  if (!to || !body) {
    throw new ApiError(400, "to and body are required for WhatsApp messages");
  }

  const url = `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`;

  await axios.post(
    url,
    {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { body },
    },
    {
      headers: {
        Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );
}

module.exports = {
  isWhatsAppConfigured,
  sendWhatsAppText,
};

const IntegrationProvider = require("../models/IntegrationProvider");
const IntegrationConfig = require("../models/IntegrationConfig");
const { decrypt } = require("../utils/encryption");

// razorpayService.js/fshipService.js need synchronous, zero-latency access
// to their credentials (they're read inside `if` guards on the hot request
// path). Rather than making that whole call chain async, this module keeps
// an in-memory cache populated at boot and refreshed only on Save/Enable/
// Disable — normal payment/shipment traffic never touches the DB for config.
const SECRET_FIELDS = {
  razorpay: ["keySecret", "webhookSecret"],
  fship: ["clientSecret", "clientId", "username", "password"],
  google: ["clientSecret"],
  facebook: ["appSecret"],
};

const cache = new Map(); // providerCode -> { enabled, ...decrypted config fields }

// MySQL JSON columns come back from Sequelize as raw strings in this setup
// (same quirk worked around in controllers/shippingController.js's parseJson).
function parseConfigJson(value) {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }
  return value;
}

async function loadFromDb(providerCode) {
  const provider = await IntegrationProvider.findOne({ where: { providerCode } });
  if (!provider) return { enabled: false };

  // One row can exist per environment (sandbox + production). The most
  // recently saved row wins — i.e. the environment the admin last edited is
  // the one live payment/shipment traffic uses. Keep in sync with the same
  // ordering in controllers/integrationsController.js.
  const config = await IntegrationConfig.findOne({ where: { providerId: provider.id }, order: [["updated_at", "DESC"]] });
  const raw = parseConfigJson(config?.configJson);
  const decrypted = { ...raw };
  for (const field of SECRET_FIELDS[providerCode] || []) {
    decrypted[field] = raw[field] ? decrypt(raw[field]) : null;
  }

  return { enabled: provider.status === "enabled", ...decrypted };
}

async function refreshConfig(providerCode) {
  const data = await loadFromDb(providerCode);
  cache.set(providerCode, data);
  return data;
}

function getCachedConfig(providerCode) {
  return cache.get(providerCode) || { enabled: false };
}

async function initIntegrationConfigCache() {
  await Promise.all(["razorpay", "fship", "google", "facebook"].map(refreshConfig));
}

module.exports = { initIntegrationConfigCache, refreshConfig, getCachedConfig, SECRET_FIELDS, parseConfigJson };

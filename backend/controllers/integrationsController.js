const IntegrationProvider = require("../models/IntegrationProvider");
const IntegrationConfig = require("../models/IntegrationConfig");
const IntegrationAuditLog = require("../models/IntegrationAuditLog");
const { encrypt, decrypt } = require("../utils/encryption");
const { refreshConfig, SECRET_FIELDS, parseConfigJson } = require("../services/integrationConfigService");
const razorpayService = require("../services/razorpayService");
const fshipService = require("../services/fshipService");

const PROVIDER_CODES = new Set(["razorpay", "fship"]);

const REQUIRED_FIELDS = {
  razorpay: ["keyId", "keySecret", "currency", "environment"],
  fship: ["apiUrl", "clientSecret", "pickupAddressId"],
};

const NUMERIC_FIELDS = {
  razorpay: [],
  fship: ["pickupAddressId", "returnAddressId", "defaultCourierId", "defaultWeight", "defaultLength", "defaultWidth", "defaultHeight"],
};

function findProviderCode(req, res) {
  const code = String(req.params.providerCode || "").toLowerCase();
  if (!PROVIDER_CODES.has(code)) {
    res.status(404).json({ success: false, message: `Unknown integration provider: ${req.params.providerCode}` });
    return null;
  }
  return code;
}

// Never let a secret value leak to the frontend — replace each secret field
// with a boolean "is it set" flag instead of returning it (masked or not).
function maskSecrets(providerCode, raw = {}) {
  const out = { ...raw };
  for (const field of SECRET_FIELDS[providerCode] || []) {
    out[`${field}IsSet`] = Boolean(raw[field]);
    delete out[field];
  }
  return out;
}

function decryptConfig(providerCode, raw = {}) {
  const out = { ...raw };
  for (const field of SECRET_FIELDS[providerCode] || []) {
    out[field] = raw[field] ? decrypt(raw[field]) : null;
  }
  return out;
}

function encryptConfig(providerCode, plain = {}) {
  const out = { ...plain };
  for (const field of SECRET_FIELDS[providerCode] || []) {
    out[field] = plain[field] ? encrypt(plain[field]) : null;
  }
  return out;
}

async function writeAudit(req, { providerCode, action, oldValue, newValue }) {
  try {
    await IntegrationAuditLog.create({
      providerCode,
      action,
      performedByUserId: req.currentUser?.id ?? null,
      performedByName: req.currentUser?.name ?? null,
      performedByEmail: req.currentUser?.email ?? null,
      ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || req.ip || null,
      oldValue: oldValue ? maskSecrets(providerCode, oldValue) : null,
      newValue: newValue ? maskSecrets(providerCode, newValue) : null,
    });
  } catch (err) {
    // Audit logging must never break the real config-change flow.
    console.error("Integration audit log write failed:", err.message);
  }
}

async function list(req, res) {
  try {
    const providers = await IntegrationProvider.findAll({ order: [["id", "ASC"]] });
    const data = await Promise.all(
      providers.map(async (provider) => {
        const config = await IntegrationConfig.findOne({ where: { providerId: provider.id } });
        return {
          providerCode: provider.providerCode,
          providerName: provider.providerName,
          enabled: provider.status === "enabled",
          environment: config?.environment || "production",
          connectionStatus: config?.status || "untested",
          lastTestedAt: config?.lastTestedAt || null,
          lastError: config?.lastError || null,
          configured: Boolean(config),
        };
      })
    );
    res.json({ success: true, data });
  } catch (err) {
    console.error("List integrations ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to load integrations" });
  }
}

async function getOne(req, res) {
  const providerCode = findProviderCode(req, res);
  if (!providerCode) return;
  try {
    const provider = await IntegrationProvider.findOne({ where: { providerCode } });
    if (!provider) return res.status(404).json({ success: false, message: "Integration not found" });

    const config = await IntegrationConfig.findOne({ where: { providerId: provider.id } });
    res.json({
      success: true,
      data: {
        providerCode: provider.providerCode,
        providerName: provider.providerName,
        enabled: provider.status === "enabled",
        environment: config?.environment || "production",
        connectionStatus: config?.status || "untested",
        lastTestedAt: config?.lastTestedAt || null,
        lastError: config?.lastError || null,
        config: maskSecrets(providerCode, parseConfigJson(config?.configJson)),
      },
    });
  } catch (err) {
    console.error("Get integration ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to load integration config" });
  }
}

async function save(req, res) {
  const providerCode = findProviderCode(req, res);
  if (!providerCode) return;
  try {
    const provider = await IntegrationProvider.findOne({ where: { providerCode } });
    if (!provider) return res.status(404).json({ success: false, message: "Integration not found" });

    const environment = String(req.body.environment || "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
    const existing = await IntegrationConfig.findOne({ where: { providerId: provider.id, environment } });
    const previousPlain = existing ? decryptConfig(providerCode, parseConfigJson(existing.configJson)) : {};

    // Blank secret inputs mean "leave unchanged" — the frontend never
    // receives plaintext secrets back, so an empty field cannot mean
    // "clear this value" without an explicit separate action.
    const incoming = { ...req.body };
    delete incoming.environment;
    const merged = { ...previousPlain, environment };
    for (const [key, value] of Object.entries(incoming)) {
      if ((SECRET_FIELDS[providerCode] || []).includes(key) && (value === "" || value === undefined || value === null)) {
        continue; // keep previous value
      }
      merged[key] = value;
    }
    for (const field of NUMERIC_FIELDS[providerCode] || []) {
      if (merged[field] !== undefined && merged[field] !== null && merged[field] !== "") {
        merged[field] = Number(merged[field]);
      }
    }

    const missing = (REQUIRED_FIELDS[providerCode] || []).filter((field) => {
      const value = merged[field];
      return value === undefined || value === null || value === "";
    });
    if (missing.length > 0) {
      return res.status(422).json({ success: false, message: `Missing required field(s): ${missing.join(", ")}` });
    }

    const configJson = encryptConfig(providerCode, merged);

    if (existing) {
      await existing.update({
        configJson,
        status: "untested", // any edit invalidates the previous test result
        lastTestedAt: null,
        lastError: null,
        updatedByUserId: req.currentUser?.id ?? null,
      });
    } else {
      await IntegrationConfig.create({
        providerId: provider.id,
        environment,
        configJson,
        status: "untested",
        createdByUserId: req.currentUser?.id ?? null,
        updatedByUserId: req.currentUser?.id ?? null,
      });
    }

    await refreshConfig(providerCode);
    await writeAudit(req, {
      providerCode,
      action: existing ? "config_updated" : "config_created",
      oldValue: existing ? previousPlain : null,
      newValue: merged,
    });

    res.json({ success: true, message: "Integration settings saved" });
  } catch (err) {
    console.error("Save integration ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to save integration settings" });
  }
}

async function testConnection(req, res) {
  const providerCode = findProviderCode(req, res);
  if (!providerCode) return;
  try {
    const provider = await IntegrationProvider.findOne({ where: { providerCode } });
    if (!provider) return res.status(404).json({ success: false, message: "Integration not found" });

    const environment = String(req.body.environment || "production").toLowerCase() === "sandbox" ? "sandbox" : "production";
    const existing = await IntegrationConfig.findOne({ where: { providerId: provider.id, environment } });
    const savedPlain = existing ? decryptConfig(providerCode, parseConfigJson(existing.configJson)) : {};

    // Let the admin test unsaved edits from the form, falling back to the
    // saved+decrypted value for any secret field left blank in the request.
    const testValues = { ...savedPlain };
    for (const [key, value] of Object.entries(req.body || {})) {
      if ((SECRET_FIELDS[providerCode] || []).includes(key) && (value === "" || value === undefined || value === null)) {
        continue;
      }
      testValues[key] = value;
    }

    let ok = true;
    let errorMessage = null;
    try {
      if (providerCode === "razorpay") {
        await razorpayService.testCredentials({ keyId: testValues.keyId, keySecret: testValues.keySecret });
      } else {
        await fshipService.testCredentials({ apiUrl: testValues.apiUrl, clientSecret: testValues.clientSecret });
      }
    } catch (err) {
      ok = false;
      errorMessage = err.error?.description || err.message || "Connection test failed";
    }

    if (existing) {
      await existing.update({ status: ok ? "connected" : "failed", lastTestedAt: new Date(), lastError: ok ? null : errorMessage });
    }

    await writeAudit(req, {
      providerCode,
      action: ok ? "test_connection_success" : "test_connection_failed",
      oldValue: null,
      newValue: { status: ok ? "connected" : "failed", lastError: errorMessage },
    });

    res.json({ success: ok, message: ok ? "Connection successful" : errorMessage });
  } catch (err) {
    console.error("Test integration connection ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to run connection test" });
  }
}

async function setEnabled(req, res, enabled) {
  const providerCode = findProviderCode(req, res);
  if (!providerCode) return;
  try {
    const provider = await IntegrationProvider.findOne({ where: { providerCode } });
    if (!provider) return res.status(404).json({ success: false, message: "Integration not found" });

    const previousStatus = provider.status;
    await provider.update({ status: enabled ? "enabled" : "disabled" });
    await refreshConfig(providerCode);
    await writeAudit(req, {
      providerCode,
      action: enabled ? "enabled" : "disabled",
      oldValue: { status: previousStatus },
      newValue: { status: provider.status },
    });

    res.json({ success: true, message: `Integration ${enabled ? "enabled" : "disabled"}` });
  } catch (err) {
    console.error("Toggle integration ERROR:", err.message);
    res.status(500).json({ success: false, message: "Failed to update integration status" });
  }
}

module.exports = {
  list,
  getOne,
  save,
  testConnection,
  enable: (req, res) => setEnabled(req, res, true),
  disable: (req, res) => setEnabled(req, res, false),
};

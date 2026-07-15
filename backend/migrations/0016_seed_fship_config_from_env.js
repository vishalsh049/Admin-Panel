const { encrypt } = require("../utils/encryption");

// Mirrors the CURRENT, working FSHIP_* .env values into integration_configs
// so the DB-backed config path is production-ready the instant it goes live
// — no admin re-entry required, no downtime for the already-live Fship
// integration. status stays 'untested': migrations must not make outbound
// HTTP calls (fragile at boot); an admin flips it to 'connected' via the
// Test Connection button in the new Integrations UI after deploy.
module.exports = {
  async up(queryInterface, { sequelize }) {
    const [[provider]] = await sequelize.query(
      "SELECT id FROM integration_providers WHERE provider_code = 'fship' LIMIT 1"
    );
    if (!provider) return; // 0015 didn't run for some reason — nothing to seed onto

    const [[existing]] = await sequelize.query(
      "SELECT id FROM integration_configs WHERE provider_id = ? LIMIT 1",
      { replacements: [provider.id] }
    );
    if (existing) return; // already seeded

    const apiUrl = (process.env.FSHIP_BASE_URL || "https://capi-qc.fship.in").trim();
    const clientSecret = (process.env.FSHIP_SIGNATURE || "").trim();
    const pickupAddressId = Number(process.env.FSHIP_PICKUP_ADDRESS_ID || 0);
    const returnAddressId = Number(process.env.FSHIP_RETURN_ADDRESS_ID || pickupAddressId || 0);
    const defaultCourierId = Number(process.env.FSHIP_COURIER_ID || 0);
    const environment = /capi-qc\./i.test(apiUrl) ? "sandbox" : "production";

    const configJson = {
      apiUrl,
      clientId: null, // reserved — Fship's live API only checks the signature/clientSecret header
      clientSecret: encrypt(clientSecret) || null,
      username: null, // reserved
      password: null, // reserved
      pickupAddressId,
      returnAddressId,
      defaultCourierId,
      defaultWeight: 1,
      defaultLength: 10,
      defaultWidth: 10,
      defaultHeight: 10,
      environment,
    };

    await sequelize.query(
      `INSERT INTO integration_configs
        (provider_id, environment, config_json, encrypted, status, last_tested_at, last_error, created_at, updated_at)
       VALUES (?, ?, ?, 1, 'untested', NULL, NULL, NOW(), NOW())`,
      { replacements: [provider.id, environment, JSON.stringify(configJson)] }
    );
  },
};

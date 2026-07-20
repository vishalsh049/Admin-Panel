// Seeds the two OAuth social-login providers into the same
// integration_providers/integration_configs tables Razorpay/Fship already
// use (see 0015_create_integration_tables.js) — no new tables needed since
// config_json is freeform per-provider.
//
// Both start 'disabled': the storefront's Google/Facebook login buttons
// stay hidden (see /api/store/auth/social-config) until an admin pastes in
// real credentials via Settings > Integrations and flips the toggle — same
// safe-by-default pattern Razorpay used (0015's comment: "razorpay starts
// 'disabled' because it is currently unconfigured").
//
// Google's Client ID is not a secret (it ships inside the frontend bundle),
// so it is pre-filled here from the value that was previously hardcoded in
// the frontend/backend as a fallback — continuity for the admin, not a
// runtime hardcode. The Client Secret is never known to this migration and
// stays null until the admin enters it.
module.exports = {
  async up(queryInterface, { sequelize }) {
    await sequelize.query(`
      INSERT INTO integration_providers (provider_name, provider_code, status)
      SELECT 'Google OAuth', 'google', 'disabled'
      WHERE NOT EXISTS (SELECT 1 FROM integration_providers WHERE provider_code = 'google')
    `);
    await sequelize.query(`
      INSERT INTO integration_providers (provider_name, provider_code, status)
      SELECT 'Facebook OAuth', 'facebook', 'disabled'
      WHERE NOT EXISTS (SELECT 1 FROM integration_providers WHERE provider_code = 'facebook')
    `);

    const [[googleProvider]] = await sequelize.query(
      "SELECT id FROM integration_providers WHERE provider_code = 'google' LIMIT 1"
    );
    if (googleProvider) {
      const [[existingConfig]] = await sequelize.query(
        "SELECT id FROM integration_configs WHERE provider_id = ? LIMIT 1",
        { replacements: [googleProvider.id] }
      );
      if (!existingConfig) {
        const configJson = {
          clientId: "1044460214029-6mqa81idrnign8oqh39674017lcuplp3.apps.googleusercontent.com",
          clientSecret: null,
        };
        await sequelize.query(
          `INSERT INTO integration_configs
            (provider_id, environment, config_json, encrypted, status, last_tested_at, last_error, created_at, updated_at)
           VALUES (?, 'production', ?, 1, 'untested', NULL, NULL, NOW(), NOW())`,
          { replacements: [googleProvider.id, JSON.stringify(configJson)] }
        );
      }
    }
  },
};

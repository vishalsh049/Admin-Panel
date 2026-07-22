// Shared helper for persisting one-way import/sync run history into the
// existing integration_audit_logs table (models/IntegrationAuditLog.js,
// otherwise used only for integration credential-change auditing by
// controllers/integrationsController.js). Reused here instead of adding a
// dedicated sync_log table.
const IntegrationAuditLog = require("../models/IntegrationAuditLog");

async function writeSyncLog(req, providerCode, action, report) {
  try {
    await IntegrationAuditLog.create({
      providerCode,
      action,
      performedByUserId: req.currentUser?.id ?? null,
      performedByName: req.currentUser?.name ?? null,
      performedByEmail: req.currentUser?.email ?? null,
      ipAddress: req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket?.remoteAddress || req.ip || null,
      newValue: report,
    });
  } catch (err) {
    // Audit logging must never break the real sync flow.
    console.error(`${providerCode} sync audit log write failed:`, err.message);
  }
}

module.exports = { writeSyncLog };

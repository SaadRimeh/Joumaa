const AuditLog = require("../models/AuditLog");

async function logAction({
  actorRole,
  actorId,
  action,
  entityType,
  entityId,
  payload = {},
}) {
  try {
    await AuditLog.create({
      actorRole,
      actorId,
      action,
      entityType,
      entityId,
      payload,
    });
  } catch (error) {
    console.error("Failed to write audit log:", error.message);
  }
}

module.exports = {
  logAction,
};

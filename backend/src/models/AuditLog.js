const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema(
  {
    actorRole: {
      type: String,
      enum: ["admin", "employee", "system"],
      required: true,
    },
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    entityType: {
      type: String,
      required: true,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      required: false,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);

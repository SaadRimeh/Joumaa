const mongoose = require("mongoose");

const employeeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    car: {
      type: String,
      required: true,
      trim: true,
    },
    uniqueCode: {
      type: String,
      required: true,
      unique: true,
      match: [/^\d{6}$/, "Employee code must be exactly 6 digits"],
    },
    currentStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalDistributed: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLoginAt: {
      type: Date,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
    },
  },
  {
    timestamps: true,
  }
);

employeeSchema.index({ uniqueCode: 1 }, { unique: true });
employeeSchema.index({ isActive: 1, createdAt: -1 });

module.exports = mongoose.model("Employee", employeeSchema);

const mongoose = require("mongoose");

const distributionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    merchantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Merchant",
      required: true,
      index: true,
    },
    merchantName: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0.001,
    },
    pricePerKilo: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    employeeStockBefore: {
      type: Number,
      required: true,
      min: 0,
    },
    employeeStockAfter: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "credit", "partial"],
      default: "paid",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      lat: Number,
      lng: Number,
      address: String,
    },
  },
  {
    timestamps: true,
  }
);

distributionSchema.index({ createdAt: -1 });
distributionSchema.index({ employeeId: 1, createdAt: -1 });
distributionSchema.index({ merchantId: 1, createdAt: -1 });

module.exports = mongoose.model("Distribution", distributionSchema);

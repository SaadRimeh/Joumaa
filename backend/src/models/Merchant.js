const mongoose = require("mongoose");

const merchantTransactionSchema = new mongoose.Schema(
  {
    distributionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Distribution",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 0,
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const merchantSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    shopName: {
      type: String,
      trim: true,
      default: "",
    },
    location: {
      type: String,
      trim: true,
      default: "",
    },
    totalReceived: {
      type: Number,
      default: 0,
      min: 0,
    },
    transactions: {
      type: [merchantTransactionSchema],
      default: [],
    },
    createdByEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
    },
  },
  {
    timestamps: true,
  }
);

merchantSchema.index({ name: 1, phone: 1 });
merchantSchema.index({ totalReceived: -1 });

module.exports = mongoose.model("Merchant", merchantSchema);

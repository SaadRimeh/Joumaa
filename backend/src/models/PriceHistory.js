const mongoose = require("mongoose");

const priceHistorySchema = new mongoose.Schema(
  {
    oldPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    newPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

priceHistorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("PriceHistory", priceHistorySchema);

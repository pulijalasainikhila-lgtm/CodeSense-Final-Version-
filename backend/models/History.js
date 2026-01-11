const mongoose = require("mongoose");

const historySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["explain", "convert"], required: true },
    inputCode: { type: String, required: true },
    language: { type: String },
    targetLanguage: { type: String },
    result: { type: String, required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model("History", historySchema);

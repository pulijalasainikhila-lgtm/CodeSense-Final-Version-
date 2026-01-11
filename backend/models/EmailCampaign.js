// models/EmailCampaign.js
const mongoose = require("mongoose");

const emailCampaignSchema = new mongoose.Schema(
  {
    admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    taskId: { type: String, required: true },
    recipients: { type: Number, required: true },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    status: { 
      type: String, 
      enum: ['queued', 'processing', 'success', 'failed'], 
      default: 'queued' 
    },
    progress: { type: Object, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.model("EmailCampaign", emailCampaignSchema);
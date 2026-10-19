const mongoose = require("mongoose");

const linkedInConnectionSchema = new mongoose.Schema(
  {
    memberId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    accessToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("LinkedInConnection", linkedInConnectionSchema);

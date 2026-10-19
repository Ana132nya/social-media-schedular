const mongoose = require("mongoose");

const instagramConnectionSchema = new mongoose.Schema(
  {
    accountId: { type: String, required: true, unique: true },
    username: { type: String, required: true, trim: true },
    accessToken: { type: String, required: true },
    tokenExpiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InstagramConnection", instagramConnectionSchema);

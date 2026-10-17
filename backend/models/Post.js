const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    clientId: {
      type: String,
      unique: true,
      sparse: true,
      maxlength: 100,
    },

    platform: {
      type: String,
      enum: ["Instagram", "Facebook", "LinkedIn", "Twitter / X"],
      required: true,
    },

    caption: {
      type: String,
      required: true,
      trim: true,
    },

    image: {
      type: String,
      default: "",
    },

    date: {
      type: String,
      required: true,
    },

    time: {
      type: String,
      required: true,
    },

    timezoneOffsetMinutes: {
      type: Number,
      min: -840,
      max: 840,
    },

    status: {
      type: String,
      enum: ["Scheduled", "Published", "Failed", "Cancelled"],
      default: "Scheduled",
    },

    firstComment: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);
const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    platform: {
      type: String,
      enum: ["Instagram", "LinkedIn", "X"],
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

    status: {
      type: String,
      enum: ["Scheduled", "Published", "Failed", "Cancelled"],
      default: "Scheduled",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Post", postSchema);
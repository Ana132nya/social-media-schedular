const express = require("express");
const mongoose = require("mongoose");
const Post = require("../models/Post");

const router = express.Router();
const isValidDate = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === value;
};

function sendPostError(res, error, operation) {
  console.error(`${operation} error:`, error);

  if (error.name === "ValidationError" || error.name === "CastError") {
    return res.status(400).json({ message: "Post data is invalid" });
  }

  const unavailable = mongoose.connection.readyState !== 1 ||
    ["MongoNetworkError", "MongoServerSelectionError", "MongooseServerSelectionError"].includes(error.name) ||
    /buffering timed out|server selection/i.test(error.message);

  if (unavailable) {
    return res.status(503).json({ message: "Database is temporarily unavailable" });
  }

  return res.status(500).json({ message: `Failed to ${operation.toLowerCase()}` });
}

// Create / Schedule Post
router.post("/", async (req, res) => {
  try {
    const { clientId, platform, caption, image, date, time, timezoneOffsetMinutes } = req.body || {};

    if (typeof caption !== "string" || !caption.trim() || !date || !time) {
      return res.status(400).json({
        message: "A non-empty caption, date, and time are required",
      });
    }

    if (!Post.schema.path("platform").enumValues.includes(platform)) {
      return res.status(400).json({ message: "Platform is not supported" });
    }

    if (!isValidDate(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({ message: "Date or time is invalid" });
    }

    if (!Number.isInteger(timezoneOffsetMinutes) || Math.abs(timezoneOffsetMinutes) > 840) {
      return res.status(400).json({ message: "Timezone offset is invalid" });
    }

    const scheduledAt = Date.parse(`${date}T${time}:00.000Z`) + timezoneOffsetMinutes * 60_000;
    if (scheduledAt <= Date.now()) {
      return res.status(400).json({ message: "Scheduled time must be in the future" });
    }

    if (typeof clientId !== "string" || !clientId.trim() || clientId.length > 100) {
      return res.status(400).json({ message: "A valid client ID is required" });
    }

    if (image !== undefined && typeof image !== "string") {
      return res.status(400).json({ message: "Image must be a URL string" });
    }

    const existingPost = await Post.findOne({ clientId });
    if (existingPost) {
      return res.status(200).json({ message: "Post was already scheduled", post: existingPost });
    }

    const post = await Post.create({
      clientId,
      platform,
      caption: caption.trim(),
      image: image?.trim() || "",
      date,
      time,
      timezoneOffsetMinutes,
      status: "Scheduled",
    });

    res.status(201).json({
      message: "Post scheduled successfully",
      post,
    });
  } catch (error) {
    if (error.code === 11000 && error.keyPattern?.clientId) {
      try {
        const existingPost = await Post.findOne({ clientId: req.body?.clientId });
        if (existingPost) {
          return res.status(200).json({ message: "Post was already scheduled", post: existingPost });
        }
      } catch (lookupError) {
        return sendPostError(res, lookupError, "Schedule post");
      }
    }
    sendPostError(res, error, "Schedule post");
  }
});

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    sendPostError(res, error, "Fetch posts");
  }
});

router.delete("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(400).json({ message: "Post ID is invalid" });
  }

  try {
    const post = await Post.findByIdAndDelete(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    sendPostError(res, error, "Delete post");
  }
});

module.exports = router;
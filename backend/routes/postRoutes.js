const express = require("express");
const Post = require("../models/Post");

const router = express.Router();

// Create / Schedule Post
router.post("/", async (req, res) => {
  try {
    const { platform, caption, image, date, time } = req.body;

    if (!platform || !caption || !date || !time) {
      return res.status(400).json({
        message: "Please fill all required fields",
      });
    }

    const post = await Post.create({
      platform,
      caption,
      image: image || "",
      date,
      time,
      status: "Scheduled",
    });

    res.status(201).json({
      message: "Post scheduled successfully",
      post,
    });
  } catch (error) {
    console.error("Create post error:", error);

    res.status(500).json({
      message: "Failed to schedule post",
      error: error.message,
    });
  }
});

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

    res.status(200).json(posts);
  } catch (error) {
    console.error("Get posts error:", error);

    res.status(500).json({
      message: "Failed to fetch posts",
      error: error.message,
    });
  }
});

module.exports = router;
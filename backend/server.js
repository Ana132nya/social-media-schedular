const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const path = require("node:path");
const { requireAuth } = require("./auth");
const authRoutes = require("./routes/authRoutes");
const postRoutes = require("./routes/postRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const scheduler = require("./scheduler");

const app = express();
const port = Number(process.env.PORT) || 5000;

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use(cors({
  origin: process.env.WEB_ORIGIN
    ? process.env.WEB_ORIGIN.split(",").map((o) => o.trim())
    : ["http://localhost:5173", "http://127.0.0.1:5173"],
  credentials: true,
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Social Media Scheduler Backend is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/posts", requireAuth, postRoutes);
app.use("/api/upload", requireAuth, uploadRoutes);

async function startServer() {
  const mongoUri = process.env.MONGO_URI?.trim();

  if (!mongoUri) {
    console.error(
      "MONGO_URI is missing. Add it to backend/.env using backend/.env.example as a template."
    );
    process.exitCode = 1;
    return;
  }

  if (!process.env.APP_PASSWORD || !process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error("APP_PASSWORD and a SESSION_SECRET of at least 32 characters must be configured.");
    process.exitCode = 1;
    return;
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB connected");

    scheduler.start();

    app.listen(port, () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (error) {
    const isAuthenticationError =
      error.code === 8000 || /bad auth|authentication failed/i.test(error.message);

    if (isAuthenticationError) {
      console.error(
        "MongoDB authentication failed. Verify the database username and password, URL-encode special characters in the password, and confirm the user has access to this cluster."
      );
    } else {
      console.error("MongoDB connection failed:", error.message);
    }
    process.exitCode = 1;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
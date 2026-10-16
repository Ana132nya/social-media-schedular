const express = require("express");
const { clearSessionCookie, requireAuth, setSessionCookie, verifyPassword } = require("../auth");

const router = express.Router();
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

router.post("/login", (req, res) => {
  const now = Date.now();
  const clientKey = req.ip;
  const attempt = attempts.get(clientKey);

  if (attempt && now - attempt.startedAt < WINDOW_MS && attempt.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ message: "Too many login attempts. Try again later." });
  }

  const password = req.body?.password;
  if (!verifyPassword(password)) {
    const nextAttempt = attempt && now - attempt.startedAt < WINDOW_MS
      ? { ...attempt, count: attempt.count + 1 }
      : { startedAt: now, count: 1 };
    attempts.set(clientKey, nextAttempt);
    return res.status(401).json({ message: "Invalid password" });
  }

  attempts.delete(clientKey);
  setSessionCookie(req, res);
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ authenticated: true });
});

router.get("/session", requireAuth, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({ authenticated: true });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(req, res);
  res.status(200).json({ authenticated: false });
});

module.exports = router;
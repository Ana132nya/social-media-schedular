const crypto = require("node:crypto");
const express = require("express");
const { requireAuth } = require("../auth");
const LinkedInConnection = require("../models/LinkedInConnection");
const { appBaseUrl, encrypt, getCookie } = require("../instagram");
const { getConnection } = require("../linkedin");

const router = express.Router();
const STATE_COOKIE = "linkedin_oauth_state";

function callbackUrl() {
  return process.env.LINKEDIN_REDIRECT_URI || `${appBaseUrl()}/api/linkedin/callback`;
}

function isConfigured() {
  return Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
}

function setState(res, state) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Path=/api/linkedin; Max-Age=600${secure}`);
}

function clearState(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/linkedin; Max-Age=0${secure}`);
}

router.get("/status", requireAuth, async (req, res) => {
  if (!isConfigured()) return res.json({ configured: false, connected: false, name: null, expiresAt: null });
  const connection = await getConnection();
  res.setHeader("Cache-Control", "no-store");
  res.json({ configured: true, connected: Boolean(connection), name: connection?.name || null, expiresAt: connection?.tokenExpiresAt || null });
});

router.get("/connect", requireAuth, (req, res) => {
  if (!isConfigured()) return res.status(503).json({ message: "LinkedIn OAuth is not configured on the server" });
  const state = crypto.randomBytes(32).toString("base64url");
  setState(res, state);
  const params = new URLSearchParams({ response_type: "code", client_id: process.env.LINKEDIN_CLIENT_ID, redirect_uri: callbackUrl(), state, scope: "openid profile w_member_social" });
  res.redirect(`https://www.linkedin.com/oauth/v2/authorization?${params}`);
});

router.get("/callback", async (req, res) => {
  const fail = (message) => res.redirect(`${appBaseUrl()}/?linkedin_error=${encodeURIComponent(message)}`);
  const expectedState = getCookie(req, STATE_COOKIE);
  clearState(res);
  if (!expectedState || req.query.state !== expectedState) return fail("LinkedIn authorization could not be verified. Try again.");
  if (req.query.error) return fail(req.query.error_description || "LinkedIn authorization was cancelled");
  if (typeof req.query.code !== "string") return fail("LinkedIn did not return an authorization code");

  try {
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code: req.query.code, redirect_uri: callbackUrl(), client_id: process.env.LINKEDIN_CLIENT_ID, client_secret: process.env.LINKEDIN_CLIENT_SECRET }),
    });
    const token = await tokenResponse.json();
    if (!tokenResponse.ok || !token.access_token) throw new Error(token.error_description || "LinkedIn token exchange failed");
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", { headers: { Authorization: `Bearer ${token.access_token}` } });
    const profile = await profileResponse.json();
    if (!profileResponse.ok || !profile.sub) throw new Error("LinkedIn profile request failed");
    await LinkedInConnection.findOneAndUpdate({}, { memberId: profile.sub, name: profile.name || profile.given_name || "LinkedIn member", accessToken: encrypt(token.access_token), tokenExpiresAt: new Date(Date.now() + Number(token.expires_in || 0) * 1000) }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return res.redirect(`${appBaseUrl()}/?linkedin_connected=1`);
  } catch (error) {
    console.error("LinkedIn OAuth callback failed:", error.message);
    return fail("LinkedIn connection failed. Check the app settings and try again.");
  }
});

router.delete("/connection", requireAuth, async (req, res) => {
  await LinkedInConnection.deleteMany({});
  res.status(204).end();
});

module.exports = router;

const crypto = require("node:crypto");
const express = require("express");
const { requireAuth } = require("../auth");
const InstagramConnection = require("../models/InstagramConnection");
const {
  OAUTH_STATE_COOKIE, appBaseUrl, callbackUrl, clearOauthState, encrypt, getConnection,
  getCookie, graphRequest, isConfigured, setOauthState,
} = require("../instagram");

const router = express.Router();

router.get("/status", requireAuth, async (req, res) => {
  if (!isConfigured()) {
    res.setHeader("Cache-Control", "no-store");
    return res.json({ configured: false, connected: false, username: null, expiresAt: null });
  }
  const connection = await getConnection();
  res.setHeader("Cache-Control", "no-store");
  res.json({ configured: true, connected: Boolean(connection), username: connection?.username || null, expiresAt: connection?.tokenExpiresAt || null });
});

router.get("/connect", requireAuth, (req, res) => {
  if (!isConfigured()) return res.status(503).json({ message: "Instagram OAuth is not configured on the server" });
  const state = crypto.randomBytes(32).toString("base64url");
  setOauthState(res, state);
  const params = new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID, redirect_uri: callbackUrl(), response_type: "code", scope: "instagram_business_basic,instagram_business_content_publish", state });
  res.redirect(`https://www.instagram.com/oauth/authorize?${params}`);
});

router.get("/callback", async (req, res) => {
  const fail = (message) => res.redirect(`${appBaseUrl()}/?instagram_error=${encodeURIComponent(message)}`);
  const expectedState = getCookie(req, OAUTH_STATE_COOKIE);
  clearOauthState(res);
  if (!expectedState || req.query.state !== expectedState) return fail("Instagram authorization could not be verified. Try again.");
  if (req.query.error) return fail(req.query.error_description || "Instagram authorization was cancelled");
  if (typeof req.query.code !== "string") return fail("Instagram did not return an authorization code");

  try {
    const tokenResponse = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: process.env.INSTAGRAM_APP_ID, client_secret: process.env.INSTAGRAM_APP_SECRET, grant_type: "authorization_code", redirect_uri: callbackUrl(), code: req.query.code }),
    });
    const shortToken = await tokenResponse.json();
    if (!tokenResponse.ok || !shortToken.access_token) throw new Error(shortToken.error_message || "Instagram token exchange failed");
    const longToken = await graphRequest(`/access_token?${new URLSearchParams({ grant_type: "ig_exchange_token", access_token: shortToken.access_token })}`);
    const profile = await graphRequest(`/me?${new URLSearchParams({ fields: "user_id,username", access_token: longToken.access_token })}`);
    const expiresAt = new Date(Date.now() + Number(longToken.expires_in || 0) * 1000);
    await InstagramConnection.findOneAndUpdate({}, { accountId: profile.user_id || profile.id || shortToken.user_id, username: profile.username || "Instagram account", accessToken: encrypt(longToken.access_token), tokenExpiresAt: expiresAt }, { upsert: true, new: true, setDefaultsOnInsert: true });
    return res.redirect(`${appBaseUrl()}/?instagram_connected=1`);
  } catch (error) {
    console.error("Instagram OAuth callback failed:", error.message);
    return fail("Instagram connection failed. Check the app settings and try again.");
  }
});

router.delete("/connection", requireAuth, async (req, res) => {
  await InstagramConnection.deleteMany({});
  res.status(204).end();
});

module.exports = router;

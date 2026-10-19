const crypto = require("node:crypto");
const InstagramConnection = require("./models/InstagramConnection");

const OAUTH_STATE_COOKIE = "instagram_oauth_state";
const GRAPH_VERSION = process.env.INSTAGRAM_GRAPH_VERSION || "v24.0";

function appBaseUrl() {
  return (process.env.APP_BASE_URL || process.env.WEB_ORIGIN || "http://localhost:5173").split(",")[0].trim();
}

function callbackUrl() {
  return process.env.INSTAGRAM_REDIRECT_URI || `${appBaseUrl()}/api/instagram/callback`;
}

function encryptionKey() {
  const secret = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!secret) throw new Error("Token encryption is not configured");
  return crypto.createHash("sha256").update(secret).digest();
}

function encrypt(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value) {
  const [iv, tag, encrypted, extra] = String(value).split(".");
  if (!iv || !tag || !encrypted || extra) throw new Error("Stored Instagram token is invalid");
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, "base64url")), decipher.final()]).toString("utf8");
}

function isConfigured() {
  return Boolean(process.env.INSTAGRAM_APP_ID && process.env.INSTAGRAM_APP_SECRET);
}

function setOauthState(res, state) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${OAUTH_STATE_COOKIE}=${state}; HttpOnly; SameSite=Lax; Path=/api/instagram; Max-Age=600${secure}`);
}

function clearOauthState(res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${OAUTH_STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/instagram; Max-Age=0${secure}`);
}

function getCookie(req, name) {
  const part = req.headers.cookie?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`));
  return part ? part.slice(name.length + 1) : "";
}

async function graphRequest(path, options = {}) {
  const response = await fetch(`https://graph.instagram.com/${GRAPH_VERSION}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    throw new Error(data.error?.message || "Instagram API request failed");
  }
  return data;
}

async function getConnection() {
  return InstagramConnection.findOne().sort({ updatedAt: -1 });
}

async function publishInstagramImage(post) {
  if (!post.image) throw new Error("Instagram posts require an image");
  const connection = await getConnection();
  if (!connection) throw new Error("No Instagram account is connected");
  if (connection.tokenExpiresAt <= new Date()) throw new Error("Instagram connection expired. Reconnect the account.");

  const imageUrl = post.image.startsWith("http")
    ? post.image
    : `${String(process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "")}${post.image}`;
  if (!/^https:\/\//.test(imageUrl)) {
    throw new Error("Instagram needs a public HTTPS image URL. Set PUBLIC_BASE_URL before publishing uploaded images.");
  }

  const accessToken = decrypt(connection.accessToken);
  const createBody = new URLSearchParams({ image_url: imageUrl, caption: post.caption, access_token: accessToken });
  const container = await graphRequest(`/${connection.accountId}/media`, { method: "POST", body: createBody });
  const publishBody = new URLSearchParams({ creation_id: container.id, access_token: accessToken });
  const result = await graphRequest(`/${connection.accountId}/media_publish`, { method: "POST", body: publishBody });
  return result.id;
}

module.exports = {
  OAUTH_STATE_COOKIE, appBaseUrl, callbackUrl, clearOauthState, decrypt, encrypt,
  getConnection, getCookie, graphRequest, isConfigured, publishInstagramImage, setOauthState,
};

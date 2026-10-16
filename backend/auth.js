const crypto = require("node:crypto");

const COOKIE_NAME = "socialflow_session";
const SESSION_SECONDS = 12 * 60 * 60;

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeStringEqual(left, right) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function createSessionToken(secret) {
  const payload = Buffer.from(
    JSON.stringify({ expiresAt: Math.floor(Date.now() / 1000) + SESSION_SECONDS })
  ).toString("base64url");

  return `${payload}.${sign(payload, secret)}`;
}

function getCookie(req, name) {
  const cookie = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return cookie ? cookie.slice(name.length + 1) : "";
}

function hasValidSession(req) {
  const secret = process.env.SESSION_SECRET;
  const [payload, providedSignature, extra] = getCookie(req, COOKIE_NAME).split(".");

  if (!secret || !payload || !providedSignature || extra !== undefined) return false;

  const expectedSignature = sign(payload, secret);
  if (!safeStringEqual(providedSignature, expectedSignature)) return false;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number.isInteger(session.expiresAt) && session.expiresAt > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

function setSessionCookie(req, res) {
  const secret = process.env.SESSION_SECRET;
  const token = createSessionToken(secret);
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${encodeURIComponent(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${SESSION_SECONDS}${secure}`
  );
}

function clearSessionCookie(req, res) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`
  );
}

function requireAuth(req, res, next) {
  if (!hasValidSession(req)) {
    return res.status(401).json({ message: "Authentication required" });
  }

  next();
}

function verifyPassword(candidate) {
  const configuredPassword = process.env.APP_PASSWORD;
  return Boolean(
    configuredPassword &&
      typeof candidate === "string" &&
      safeStringEqual(candidate, configuredPassword)
  );
}

module.exports = {
  clearSessionCookie,
  requireAuth,
  setSessionCookie,
  verifyPassword,
};
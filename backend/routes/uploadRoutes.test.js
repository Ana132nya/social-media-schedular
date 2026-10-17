const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");

process.env.APP_PASSWORD = "test-password-for-socialflow";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-characters";

const app = require("../server");

let server;
let baseUrl;
let sessionCookie;
const uploadedFilesToCleanup = [];

before(async () => {
  server = app.listen(0);
  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;

  const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.APP_PASSWORD }),
  });
  assert.equal(loginResponse.status, 200);
  sessionCookie = loginResponse.headers.get("set-cookie").split(";", 1)[0];
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });

  // Cleanup any test files in uploads directory
  for (const file of uploadedFilesToCleanup) {
    try {
      const fullPath = path.join(__dirname, "..", "uploads", file);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    } catch {
      // ignore
    }
  }
});

test("rejects image upload without authentication session", async () => {
  const formData = new FormData();
  const file = new Blob(["fake png data"], { type: "image/png" });
  formData.append("image", file, "test.png");

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    body: formData,
  });

  assert.equal(response.status, 401);
});

test("rejects upload when no file is provided", async () => {
  const formData = new FormData();

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /select an image file/i);
});

test("uploads image file successfully and serves it statically", async () => {
  const formData = new FormData();
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const file = new Blob([pngHeader], { type: "image/png" });
  formData.append("image", file, "sample.png");

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert.equal(response.status, 201);
  const data = await response.json();
  assert.equal(typeof data.url, "string");
  assert.match(data.url, /^\/uploads\/upload-.*\.png$/);
  assert.equal(typeof data.filename, "string");

  uploadedFilesToCleanup.push(data.filename);

  // Test static file serving
  const staticResponse = await fetch(`${baseUrl}${data.url}`);
  assert.equal(staticResponse.status, 200);
});

test("rejects non-image file uploads", async () => {
  const formData = new FormData();
  const file = new Blob(["malicious script or text"], { type: "text/plain" });
  formData.append("image", file, "evil.txt");

  const response = await fetch(`${baseUrl}/api/upload`, {
    method: "POST",
    headers: { Cookie: sessionCookie },
    body: formData,
  });

  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /Only image files/i);
});

const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const Post = require("../models/Post");

process.env.APP_PASSWORD = "test-password-for-socialflow";
process.env.SESSION_SECRET = "test-session-secret-that-is-at-least-32-characters";

const app = require("../server");

let server;
let baseUrl;
let sessionCookie;

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
});

async function createPost(body) {
  return fetch(`${baseUrl}/api/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify(body),
  });
}

test("rejects post access without a session", async () => {
  const response = await fetch(`${baseUrl}/api/posts`);
  assert.equal(response.status, 401);
});

test("issues an HttpOnly cookie for a valid login", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: process.env.APP_PASSWORD }),
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /HttpOnly/);
});

test("rejects an incorrect login password", async () => {
  const response = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "incorrect-password" }),
  });

  assert.equal(response.status, 401);
});

test("rejects unsupported platforms with a client error", async () => {
  const response = await createPost({
    platform: "Other",
    caption: "A valid caption",
    date: "2026-10-20",
    time: "12:30",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Platform is not supported" });
});

test("rejects captions containing only whitespace", async () => {
  const response = await createPost({
    platform: "Facebook",
    caption: "   ",
    date: "2026-10-20",
    time: "12:30",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "A non-empty caption, date, and time are required",
  });
});

test("rejects impossible dates and invalid times", async () => {
  const response = await createPost({
    platform: "Facebook",
    caption: "A valid caption",
    date: "2026-02-31",
    time: "25:99",
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Date or time is invalid" });
});

test("rejects a valid but past schedule", async () => {
  const response = await createPost({
    platform: "Facebook",
    caption: "A past post",
    date: "2000-01-01",
    time: "12:30",
    timezoneOffsetMinutes: 0,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), {
    message: "Scheduled time must be in the future",
  });
});

test("returns 400 for an invalid post ID", async () => {
  const response = await fetch(`${baseUrl}/api/posts/not-an-object-id`, {
    method: "DELETE",
    headers: { Cookie: sessionCookie },
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Post ID is invalid" });
});

test("returns 503 when the database operation fails while disconnected", async () => {
  const originalFindByIdAndDelete = Post.findByIdAndDelete;
  Post.findByIdAndDelete = async () => {
    throw new Error("simulated database outage");
  };

  try {
    const response = await fetch(`${baseUrl}/api/posts/507f1f77bcf86cd799439011`, {
      method: "DELETE",
      headers: { Cookie: sessionCookie },
    });

    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { message: "Database is temporarily unavailable" });
  } finally {
    Post.findByIdAndDelete = originalFindByIdAndDelete;
  }
});

test("requires an idempotency client ID for new posts", async () => {
  const response = await createPost({
    platform: "Facebook",
    caption: "A future post",
    date: "2999-01-01",
    time: "12:30",
    timezoneOffsetMinutes: 0,
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "A valid client ID is required" });
});

test("returns the existing post for a repeated client ID", async () => {
  const originalFindOne = Post.findOne;
  const existing = { _id: "507f1f77bcf86cd799439011", clientId: "retry-key" };
  Post.findOne = async () => existing;

  try {
    const response = await createPost({
      clientId: "retry-key",
      platform: "Facebook",
      caption: "A future post",
      date: "2999-01-01",
      time: "12:30",
      timezoneOffsetMinutes: 0,
    });

    assert.equal(response.status, 200);
    assert.equal((await response.json()).post.clientId, "retry-key");
  } finally {
    Post.findOne = originalFindOne;
  }
});

test("returns 400 when updating with an invalid post ID", async () => {
  const response = await fetch(`${baseUrl}/api/posts/not-an-object-id`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Cookie: sessionCookie },
    body: JSON.stringify({ caption: "Updated caption" }),
  });

  assert.equal(response.status, 400);
  assert.deepEqual(await response.json(), { message: "Post ID is invalid" });
});

test("rejects invalid or incomplete post updates", async () => {
  const target = "507f1f77bcf86cd799439011";
  const cases = [
    [{ caption: "   " }, "Caption must not be empty"],
    [{ status: "Unknown" }, "Post status is not supported"],
    [{ date: "2999-01-01" }, "Date or time is invalid"],
    [{ date: "2000-01-01", time: "12:30", timezoneOffsetMinutes: 0 }, "Scheduled time must be in the future"],
    [{ unexpected: true }, "Post data contains unsupported fields"],
  ];

  for (const [body, message] of cases) {
    const response = await fetch(`${baseUrl}/api/posts/${target}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify(body),
    });

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { message });
  }
});

test("returns 404 when updating a non-existent post", async () => {
  const originalFindByIdAndUpdate = Post.findByIdAndUpdate;
  Post.findByIdAndUpdate = async () => null;

  try {
    const response = await fetch(`${baseUrl}/api/posts/507f1f77bcf86cd799439011`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ caption: "Updated caption" }),
    });

    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { message: "Post not found" });
  } finally {
    Post.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

test("updates post successfully with valid data", async () => {
  const originalFindByIdAndUpdate = Post.findByIdAndUpdate;
  const updatedMock = {
    _id: "507f1f77bcf86cd799439011",
    caption: "Updated caption",
    status: "Published",
  };
  Post.findByIdAndUpdate = async () => updatedMock;

  try {
    const response = await fetch(`${baseUrl}/api/posts/507f1f77bcf86cd799439011`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Cookie: sessionCookie },
      body: JSON.stringify({ caption: "Updated caption", status: "Published" }),
    });

    assert.equal(response.status, 200);
    const json = await response.json();
    assert.equal(json.message, "Post updated successfully");
    assert.equal(json.post.caption, "Updated caption");
  } finally {
    Post.findByIdAndUpdate = originalFindByIdAndUpdate;
  }
});

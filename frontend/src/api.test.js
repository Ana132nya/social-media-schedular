import assert from "node:assert/strict";
import { test } from "node:test";
import { getOfflineState, saveOfflineState, synchronizeOfflinePosts, updatePost } from "./api.js";

function installStorage() {
  const data = new Map();
  globalThis.localStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

test("syncs queued creates and deletes without losing server posts", async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  installStorage();

  const keepId = "a".repeat(24);
  const deleteId = "b".repeat(24);
  const createdId = "c".repeat(24);
  const requests = [];
  globalThis.fetch = async (url, options = {}) => {
    requests.push({ url: String(url), options });
    if (String(url) === "/api/posts" && options.method === "POST") {
      return jsonResponse({ post: { ...JSON.parse(options.body), _id: createdId } }, 201);
    }
    if (String(url) === `/api/posts/${deleteId}`) {
      return jsonResponse({ message: "deleted" });
    }
    return jsonResponse([{ _id: keepId, caption: "keep this" }, { _id: deleteId, caption: "remove this" }]);
  };

  try {
    saveOfflineState([
      { id: "local-pending", platform: "Facebook", caption: "queued", date: "2999-01-01", time: "12:00", timezoneOffsetMinutes: 0 },
    ], [deleteId]);

    const result = await synchronizeOfflinePosts();

    assert.deepEqual(result.posts.map((post) => post.id), [keepId, createdId]);
    assert.deepEqual(result.pendingDeleteIds, []);
    assert.equal(result.pendingCount, 0);
    assert.equal(requests.some((request) => request.options.method === "DELETE"), true);
    assert.equal(requests.some((request) => request.options.method === "POST"), true);
    assert.deepEqual(getOfflineState().posts.map((post) => post.id), [keepId, createdId]);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("retains offline changes when retries fail", async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  installStorage();
  const pendingId = "d".repeat(24);
  const localPost = {
    id: "local-retry",
    platform: "Facebook",
    caption: "keep queued",
    date: "2999-01-01",
    time: "12:00",
    timezoneOffsetMinutes: 0,
  };

  globalThis.fetch = async (url, options = {}) => {
    if (String(url) === "/api/posts") {
      if (options.method === "POST") return jsonResponse({ message: "unavailable" }, 503);
      return jsonResponse([]);
    }
    return jsonResponse({ message: "unavailable" }, 503);
  };

  try {
    saveOfflineState([localPost], [pendingId]);
    const result = await synchronizeOfflinePosts();

    assert.equal(result.posts.length, 1);
    assert.equal(result.posts[0].id, localPost.id);
    assert.equal(result.posts[0].caption, localPost.caption);
    assert.ok(result.posts[0].clientId);
    assert.deepEqual(result.pendingDeleteIds, [pendingId]);
    assert.equal(result.pendingCount, 2);
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("does not treat expired authentication as an offline retry", async () => {
  const previousFetch = globalThis.fetch;
  const previousStorage = globalThis.localStorage;
  installStorage();
  globalThis.fetch = async () => jsonResponse({ message: "Authentication required" }, 401);

  try {
    await assert.rejects(
      synchronizeOfflinePosts(),
      (error) => error.status === 401
    );
  } finally {
    globalThis.fetch = previousFetch;
    if (previousStorage === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = previousStorage;
  }
});

test("updatePost sends PUT request and returns normalized post", async () => {
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options = {}) => {
    assert.equal(url, "/api/posts/507f1f77bcf86cd799439011");
    assert.equal(options.method, "PUT");
    assert.equal(JSON.parse(options.body).caption, "Updated caption");
    return jsonResponse({ post: { _id: "507f1f77bcf86cd799439011", caption: "Updated caption" } });
  };

  try {
    const updated = await updatePost("507f1f77bcf86cd799439011", { caption: "Updated caption" });
    assert.equal(updated.id, "507f1f77bcf86cd799439011");
    assert.equal(updated.caption, "Updated caption");
  } finally {
    globalThis.fetch = previousFetch;
  }
});
import assert from "node:assert/strict";
import { test } from "node:test";
import { getPostStatus } from "./posts.js";

test("a past scheduled post is due, not published", () => {
  const post = {
    status: "Scheduled",
    date: "2000-01-01",
    time: "12:00",
    timezoneOffsetMinutes: 0,
  };

  assert.equal(getPostStatus(post), "Due");
});

test("published status comes from the stored status", () => {
  const post = {
    status: "Published",
    date: "2999-01-01",
    time: "12:00",
    timezoneOffsetMinutes: 0,
  };

  assert.equal(getPostStatus(post), "Published");
});
const Post = require("./models/Post");
const { publishInstagramImage } = require("./instagram");
const { publishLinkedInPost } = require("./linkedin");

const POLL_INTERVAL_MS = 30_000; // Check every 30 seconds

let timer = null;

/**
 * Background scheduler that checks for posts whose scheduled time has arrived
 * and marks them as "Published". In a production system this would call each
 * platform's API to actually publish the content; for the MVP it simply
 * transitions the status so the UI reflects the change automatically.
 */
async function publishDuePosts() {
  try {
    const now = new Date();

    // Find all posts that are still "Scheduled" and whose publish time has passed.
    const duePosts = await Post.find({ status: "Scheduled" });

    for (const post of duePosts) {
      const timezoneOffset = Number.isInteger(post.timezoneOffsetMinutes)
        ? post.timezoneOffsetMinutes
        : 0;
      const publishAt =
        Date.parse(`${post.date}T${post.time}:00.000Z`) +
        timezoneOffset * 60_000;

      if (publishAt <= now.getTime()) {
        if (post.platform === "Instagram") {
          try {
            post.instagramMediaId = await publishInstagramImage(post);
          } catch (error) {
            post.status = "Failed";
            post.publishError = error.message.slice(0, 500);
            await post.save();
            console.error(`[Scheduler] Instagram post ${post._id} failed:`, error.message);
            continue;
          }
        }
        if (post.platform === "LinkedIn") {
          try {
            post.linkedInPostId = await publishLinkedInPost(post);
          } catch (error) {
            post.status = "Failed";
            post.publishError = error.message.slice(0, 500);
            await post.save();
            console.error(`[Scheduler] LinkedIn post ${post._id} failed:`, error.message);
            continue;
          }
        }
        post.status = "Published";
        post.publishError = "";
        await post.save();
        console.log(
          `[Scheduler] Published post ${post._id} (${post.platform}) — "${post.caption.slice(0, 50)}…"`
        );
      }
    }
  } catch (error) {
    console.error("[Scheduler] Error while checking due posts:", error.message);
  }
}

function start() {
  if (timer) return;
  console.log(`[Scheduler] Started — polling every ${POLL_INTERVAL_MS / 1000}s`);
  // Run immediately on startup, then at intervals.
  publishDuePosts();
  timer = setInterval(publishDuePosts, POLL_INTERVAL_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    console.log("[Scheduler] Stopped");
  }
}

module.exports = { start, stop };

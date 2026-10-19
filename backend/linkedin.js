const LinkedInConnection = require("./models/LinkedInConnection");
const { decrypt } = require("./instagram");

const API_VERSION = process.env.LINKEDIN_API_VERSION || "202606";

function getConnection() {
  return LinkedInConnection.findOne().sort({ updatedAt: -1 });
}

async function linkedInRequest(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error_description || "LinkedIn API request failed");
  return { data, response };
}

async function publishLinkedInPost(post) {
  const connection = await getConnection();
  if (!connection) throw new Error("No LinkedIn account is connected");
  if (connection.tokenExpiresAt <= new Date()) throw new Error("LinkedIn connection expired. Reconnect the account.");

  const accessToken = decrypt(connection.accessToken);
  const { data, response } = await linkedInRequest("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "Linkedin-Version": API_VERSION,
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${connection.memberId}`,
      commentary: post.caption,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  return response.headers.get("x-restli-id") || data.id || "";
}

module.exports = { getConnection, publishLinkedInPost };

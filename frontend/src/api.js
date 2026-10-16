const LOCAL_POSTS_KEY = "socialflow.posts";

async function request(path, options) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || "The server could not complete the request.");
  }

  return payload;
}

function normalizePost(post) {
  return { ...post, id: post.id || post._id };
}

export async function getPosts() {
  const posts = await request("/api/posts");
  return posts.map(normalizePost);
}

export async function createPost(post) {
  const result = await request("/api/posts", {
    method: "POST",
    body: JSON.stringify(post),
  });

  return normalizePost(result.post);
}

export async function deletePost(id) {
  await request(`/api/posts/${id}`, { method: "DELETE" });
}

export function getLocalPosts() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveLocalPosts(posts) {
  localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(posts));
}
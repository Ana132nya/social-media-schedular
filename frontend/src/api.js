const LOCAL_POSTS_KEY = "socialflow.posts";
const SESSION_HINT_KEY = "socialflow.session";

async function request(path, options) {
  const response = await fetch(path, {
    credentials: "include",
    headers: options?.body ? { "Content-Type": "application/json" } : undefined,
    ...options,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || "The server could not complete the request.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

function normalizePost(post) {
  return { ...post, id: post.id || post._id };
}

export function getSession() {
  return request("/api/auth/session");
}

export function login(password) {
  return request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export function getInstagramStatus() {
  return request("/api/instagram/status");
}

export function disconnectInstagram() {
  return request("/api/instagram/connection", { method: "DELETE" });
}

export function connectInstagram() {
  window.location.assign("/api/instagram/connect");
}

export function getLinkedInStatus() {
  return request("/api/linkedin/status");
}

export function disconnectLinkedIn() {
  return request("/api/linkedin/connection", { method: "DELETE" });
}

export function connectLinkedIn() {
  window.location.assign("/api/linkedin/connect");
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

export async function updatePost(id, updates) {
  const result = await request(`/api/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });

  return normalizePost(result.post);
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch("/api/upload", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(payload?.message || "Failed to upload image.");
    error.status = response.status;
    throw error;
  }

  return payload;
}

export function getOfflineState() {
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_POSTS_KEY) || "null");
    if (Array.isArray(saved)) return { posts: saved, pendingDeleteIds: [] };
    return {
      posts: Array.isArray(saved?.posts) ? saved.posts : [],
      pendingDeleteIds: Array.isArray(saved?.pendingDeleteIds) ? saved.pendingDeleteIds : [],
    };
  } catch {
    return { posts: [], pendingDeleteIds: [] };
  }
}

export function saveOfflineState(posts, pendingDeleteIds = []) {
  localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify({ posts, pendingDeleteIds }));
}

export function hasSessionHint() {
  return localStorage.getItem(SESSION_HINT_KEY) === "true";
}

export function setSessionHint(isAuthenticated) {
  if (isAuthenticated) {
    localStorage.setItem(SESSION_HINT_KEY, "true");
  } else {
    localStorage.removeItem(SESSION_HINT_KEY);
  }
}

export async function synchronizeOfflinePosts() {
  const serverPosts = await getPosts();
  const offlineState = getOfflineState();
  const pendingDeleteIds = [];

  for (const id of offlineState.pendingDeleteIds) {
    try {
      await deletePost(id);
    } catch (error) {
      if (error.status === 401) throw error;
      if (error.status !== 404) pendingDeleteIds.push(id);
    }
  }

  const localPosts = [];
  const synchronizedPosts = [];
  let queuedPosts = offlineState.posts;
  for (const post of offlineState.posts) {
    if (/^[a-f\d]{24}$/i.test(String(post.id))) continue;

    const draft = { ...post };
    delete draft.id;
    draft.clientId ||= crypto.randomUUID();
    if (!post.clientId) {
      queuedPosts = queuedPosts.map((queuedPost) =>
        queuedPost.id === post.id ? { ...queuedPost, clientId: draft.clientId } : queuedPost
      );
      saveOfflineState(queuedPosts, offlineState.pendingDeleteIds);
    }
    try {
      synchronizedPosts.push(await createPost(draft));
    } catch (error) {
      if (error.status === 401) throw error;
      localPosts.push({ ...post, clientId: draft.clientId });
    }
  }

  const removedIds = new Set(offlineState.pendingDeleteIds);
  const posts = [
    ...serverPosts.filter((post) => !removedIds.has(post.id)),
    ...synchronizedPosts,
    ...localPosts,
  ];

  saveOfflineState(posts, pendingDeleteIds);
  return { posts, pendingDeleteIds, pendingCount: pendingDeleteIds.length + localPosts.length };
}

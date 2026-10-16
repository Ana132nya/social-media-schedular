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
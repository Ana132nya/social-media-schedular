import { useEffect, useState } from "react";
import "./App.css";
import Calendar from "./Calendar";
import CreatePost from "./CreatePost";
import {
  createPost,
  deletePost,
  updatePost,
  getOfflineState,
  getSession,
  hasSessionHint,
  login as loginApi,
  logout as logoutApi,
  saveOfflineState,
  setSessionHint,
  synchronizeOfflinePosts,
} from "./api";
import { getPostStatus, PLATFORM_COLORS } from "./posts";

function formatPostDate(post) {
  return new Date(`${post.date}T${post.time}`).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function Dashboard({ posts, onCreatePost, onViewPosts }) {
  const scheduled = posts.filter((post) => getPostStatus(post) === "Scheduled").length;
  const published = posts.filter((post) => getPostStatus(post) === "Published").length;
  const recentPosts = [...posts]
    .sort((a, b) => `${b.date}T${b.time}`.localeCompare(`${a.date}T${a.time}`))
    .slice(0, 5);

  return (
    <>
      <header>
        <h1>Dashboard</h1>
        <button onClick={onCreatePost}>Create Post</button>
      </header>

      <section className="stats">
        <div className="card">
          <h3>Total Posts</h3>
          <h2>{posts.length}</h2>
        </div>

        <div className="card">
          <h3>Scheduled</h3>
          <h2>{scheduled}</h2>
        </div>

        <div className="card">
          <h3>Published</h3>
          <h2>{published}</h2>
        </div>
      </section>

      <section className="recent">
        <div className="section-heading">
          <h2>Recent posts</h2>
          <button className="text-button" onClick={onViewPosts}>View all</button>
        </div>
        {recentPosts.length ? recentPosts.map((post) => {
          const status = getPostStatus(post);
          return (
            <article className="post" key={post.id}>
              <span className="platform-dot" style={{ background: PLATFORM_COLORS[post.platform] }} />
              <div className="post-copy">
                <strong>{post.caption}</strong>
                <p>{post.platform} · {formatPostDate(post)}</p>
              </div>
              <span className={`status ${status.toLowerCase()}`}>{status}</span>
            </article>
          );
        }) : <p className="empty-state">Your schedule is clear. Create a post to get started.</p>}
      </section>
    </>
  );
}

function Posts({ posts, onDelete, onUpdate }) {
  const [filter, setFilter] = useState("All posts");
  const [platformFilter, setPlatformFilter] = useState("All platforms");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredPosts = [...posts]
    .filter((post) => {
      const matchesStatus = filter === "All posts" || getPostStatus(post) === filter;
      const matchesPlatform = platformFilter === "All platforms" || post.platform === platformFilter;
      const matchesSearch = !searchQuery.trim() ||
        post.caption.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.platform.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesPlatform && matchesSearch;
    })
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return (
    <>
      <header className="posts-header">
        <div>
          <h1>Posts</h1>
          <p className="page-subtitle">Review, search, and manage your scheduled social content.</p>
        </div>

        <div className="posts-filter-bar">
          <input
            type="search"
            className="posts-search-input"
            placeholder="Search captions or platforms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="posts-filter-select"
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option>All platforms</option>
            <option>Instagram</option>
            <option>LinkedIn</option>
            <option>Twitter / X</option>
            <option>Facebook</option>
          </select>

          <select
            className="posts-filter-select"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option>All posts</option>
            <option>Scheduled</option>
            <option>Due</option>
            <option>Published</option>
            <option>Failed</option>
            <option>Cancelled</option>
          </select>
        </div>
      </header>

      <section className="post-list" aria-live="polite">
        {filteredPosts.length ? (
          filteredPosts.map((post) => {
            const status = getPostStatus(post);
            return (
              <article className="managed-post" key={post.id}>
                {post.image && <img src={post.image} alt="Post media" />}
                <div className="managed-post-content">
                  <div className="managed-post-meta">
                    <span
                      className="platform-dot"
                      style={{ background: PLATFORM_COLORS[post.platform] }}
                    />
                    <strong>{post.platform}</strong>
                    <span>{formatPostDate(post)}</span>
                    <span className={`status ${status.toLowerCase()}`}>{status}</span>
                  </div>
                  <p>{post.caption}</p>

                  {post.firstComment && (
                    <div className="managed-post-comment">
                      <span className="comment-badge-tiny">💬 First comment:</span> {post.firstComment}
                    </div>
                  )}
                </div>

                <div className="post-action-buttons">
                  {status !== "Published" && (
                    <button
                      className="action-button publish-btn"
                      onClick={() => onUpdate(post, { status: "Published" })}
                      title="Mark post as published"
                    >
                      ✓ Mark Published
                    </button>
                  )}

                  {status === "Scheduled" && (
                    <button
                      className="action-button cancel-btn"
                      onClick={() => onUpdate(post, { status: "Cancelled" })}
                      title="Cancel scheduled post"
                    >
                      ✕ Cancel
                    </button>
                  )}

                  <button
                    className="delete-button"
                    onClick={() => onDelete(post)}
                    aria-label={`Delete post: ${post.caption}`}
                  >
                    Delete
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty-state-card">
            <p className="empty-state">No posts match your current search or filters.</p>
            {(searchQuery || filter !== "All posts" || platformFilter !== "All platforms") && (
              <button
                type="button"
                className="text-button"
                onClick={() => {
                  setSearchQuery("");
                  setFilter("All posts");
                  setPlatformFilter("All platforms");
                }}
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </section>
    </>
  );
}

function Login({ error, onLogin }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setBusy(true);
    const signedIn = await onLogin(password);
    setBusy(false);
    if (signedIn) setPassword("");
  };

  return (
    <main className="auth-shell">
      <form className="auth-form" onSubmit={submit}>
        <h1>SocialFlow</h1>
        <p>Sign in to manage your social schedule.</p>
        <label htmlFor="app-password">Password</label>
        <input
          id="app-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Signing in..." : "Sign in"}</button>
      </form>
    </main>
  );
}

function App() {
  const [view, setView] = useState("dashboard");
  const [posts, setPosts] = useState([]);
  const [storageMode, setStorageMode] = useState("loading");
  const [authStatus, setAuthStatus] = useState("checking");
  const [loginError, setLoginError] = useState("");
  const [notice, setNotice] = useState("");
  // Date ("YYYY-MM-DD") to open the next view on: prefills Create Post's
  // date, or picks the month and day the Calendar starts on.
  const [focusDate, setFocusDate] = useState(null);

  const showView = (nextView, date = null) => {
    setFocusDate(date);
    setView(nextView);
  };

  useEffect(() => {
    let active = true;

    const acceptServerState = async () => {
      const result = await synchronizeOfflinePosts();
      if (!active) return;
      setPosts(result.posts);
      setStorageMode(result.pendingCount ? "local" : "server");
      setNotice(result.pendingCount
        ? "Some offline changes are still waiting to sync."
        : "");
    };

    getSession()
      .then(() => {
        setSessionHint(true);
        setAuthStatus("authenticated");
        return acceptServerState();
      })
      .catch((error) => {
        if (!active) return;

        if (error.status === 401) {
          setSessionHint(false);
          setAuthStatus("signed-out");
          return;
        }

        if (hasSessionHint()) {
          const offlineState = getOfflineState();
          setAuthStatus("authenticated");
          setPosts(offlineState.posts);
          setStorageMode("local");
          setNotice("Backend unavailable. Offline changes will sync when you reconnect.");
          return;
        }

        setAuthStatus("signed-out");
        setLoginError("Backend unavailable. Start the backend before signing in.");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated") return undefined;

    const handleOnline = async () => {
      try {
        await getSession();
        const result = await synchronizeOfflinePosts();
        setPosts(result.posts);
        setStorageMode(result.pendingCount ? "local" : "server");
        setNotice(result.pendingCount
          ? "Some offline changes are still waiting to sync."
          : "");
      } catch (error) {
        if (error.status === 401) {
          setSessionHint(false);
          setAuthStatus("signed-out");
          setLoginError("Your session expired. Sign in again to sync changes.");
        }
      }
    };

    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [authStatus]);

  const handleLogin = async (password) => {
    setLoginError("");
    try {
      await loginApi(password);
      setSessionHint(true);
      setAuthStatus("authenticated");
    } catch (error) {
      setLoginError(error.message);
      return false;
    }

    try {
      const result = await synchronizeOfflinePosts();
      setPosts(result.posts);
      setStorageMode(result.pendingCount ? "local" : "server");
      setNotice(result.pendingCount ? "Some offline changes are still waiting to sync." : "");
    } catch (error) {
      if (error.status === 401) {
        setSessionHint(false);
        setAuthStatus("signed-out");
        setLoginError("Sign in again to sync your offline changes.");
        return true;
      }
      const offlineState = getOfflineState();
      setPosts(offlineState.posts);
      setStorageMode("local");
      setNotice("Backend unavailable. Offline changes will sync when you reconnect.");
    }
    return true;
  };

  const retrySync = async () => {
    try {
      await getSession();
      const result = await synchronizeOfflinePosts();
      setPosts(result.posts);
      setStorageMode(result.pendingCount ? "local" : "server");
      setNotice(result.pendingCount
        ? "Some offline changes are still waiting to sync."
        : "All changes are synced.");
    } catch (error) {
      if (error.status === 401) {
        setSessionHint(false);
        setAuthStatus("signed-out");
        setLoginError("Your session expired. Sign in again to sync changes.");
        return;
      }
      setNotice("Could not sync changes. They remain saved in this browser.");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // Clearing the local session hint still signs out this browser offline.
    }
    setSessionHint(false);
    setAuthStatus("signed-out");
    setPosts([]);
    setStorageMode("loading");
  };

  const queueLocalPost = (post) => {
    const localPost = {
      ...post,
      clientId: post.clientId || crypto.randomUUID(),
      id: `local-${crypto.randomUUID()}`,
    };
    const offlineState = getOfflineState();
    const updatedPosts = [...posts, localPost];
    saveOfflineState(updatedPosts, offlineState.pendingDeleteIds);
    setPosts(updatedPosts);
    setStorageMode("local");
    return localPost;
  };

  const handleSchedule = async (postOrPosts) => {
    const rawItems = Array.isArray(postOrPosts) ? postOrPosts : [postOrPosts];
    const items = rawItems.map((p) => ({
      ...p,
      clientId: p.clientId || crypto.randomUUID(),
    }));

    if (storageMode === "server") {
      const savedItems = [];
      try {
        for (const item of items) {
          const saved = await createPost(item);
          savedItems.push(saved);
        }
        setPosts((currentPosts) => {
          const updated = [...currentPosts, ...savedItems];
          const offlineState = getOfflineState();
          saveOfflineState(updated, offlineState.pendingDeleteIds);
          return updated;
        });
      } catch (error) {
        if (error.status === 401) {
          setSessionHint(false);
          setAuthStatus("signed-out");
          setLoginError("Your session expired. Sign in again to schedule posts.");
          return;
        }
        if (error.status && error.status < 500) {
          setNotice(error.message);
          return;
        }
        for (const item of items) {
          queueLocalPost(item);
        }
        setNotice("Backend unavailable. This post is saved locally and will sync when reconnected.");
      }
    } else {
      for (const item of items) {
        queueLocalPost(item);
      }
      setNotice("This post is saved locally and will sync when reconnected.");
    }
    if (items.length > 0) {
      showView("calendar", items[0].date);
    }
  };

  const handleUpdatePost = async (post, updates) => {
    if (storageMode === "server") {
      try {
        const updatedPost = await updatePost(post.id, updates);
        setPosts((current) => {
          const updated = current.map((p) => (p.id === post.id ? updatedPost : p));
          const offlineState = getOfflineState();
          saveOfflineState(updated, offlineState.pendingDeleteIds);
          return updated;
        });
      } catch (error) {
        setNotice(error.message || "Failed to update post.");
      }
    } else {
      setPosts((current) => {
        const updated = current.map((p) => (p.id === post.id ? { ...p, ...updates } : p));
        const offlineState = getOfflineState();
        saveOfflineState(updated, offlineState.pendingDeleteIds);
        return updated;
      });
    }
  };

  const handleDelete = async (post) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;

    const offlineState = getOfflineState();
    const isLocalPost = !/^[a-f\d]{24}$/i.test(String(post.id));
    if (storageMode === "server") {
      try {
        await deletePost(post.id);
      } catch (error) {
        if (error.status === 401) {
          setSessionHint(false);
          setAuthStatus("signed-out");
          setLoginError("Your session expired. Sign in again to delete posts.");
          return;
        }
        if (error.status && error.status < 500 && error.status !== 404) {
          setNotice(error.message);
          return;
        }

        const updatedPosts = posts.filter((item) => item.id !== post.id);
        const pendingDeleteIds = error.status === 404 || isLocalPost
          ? offlineState.pendingDeleteIds
          : [...new Set([...offlineState.pendingDeleteIds, post.id])];
        saveOfflineState(updatedPosts, pendingDeleteIds);
        setPosts(updatedPosts);
        setStorageMode("local");
        setNotice("Delete saved locally and will sync when reconnected.");
        return;
      }

      const updatedPosts = posts.filter((item) => item.id !== post.id);
      saveOfflineState(updatedPosts, offlineState.pendingDeleteIds);
      setPosts(updatedPosts);
      return;
    }

    const updatedPosts = posts.filter((item) => item.id !== post.id);
    const pendingDeleteIds = isLocalPost
      ? offlineState.pendingDeleteIds
      : [...new Set([...offlineState.pendingDeleteIds, post.id])];
    saveOfflineState(updatedPosts, pendingDeleteIds);
    setPosts(updatedPosts);
  };

  if (authStatus === "checking") {
    return <main className="auth-shell"><p>Checking session...</p></main>;
  }

  if (authStatus !== "authenticated") {
    return <Login error={loginError} onLogin={handleLogin} />;
  }

  const navClass = (navView) => (view === navView ? "active" : undefined);

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>SocialFlow</h2>

        <nav>
          <button className={navClass("dashboard")} onClick={() => showView("dashboard")}>
            📊 Dashboard
          </button>

          <button className={navClass("create")} onClick={() => showView("create")}>
            ➕ Create Post
          </button>

          <button className={navClass("calendar")} onClick={() => showView("calendar")}>
            📅 Calendar
          </button>

          <button className={navClass("posts")} onClick={() => showView("posts")}>
            📝 Posts
          </button>
        </nav>
        <p className={`connection-state ${storageMode}`}>
          <span /> {storageMode === "server" ? "Connected to database" : storageMode === "loading" ? "Connecting..." : "Browser storage"}
        </p>
        <button className="logout-button" onClick={handleLogout}>Sign out</button>
      </aside>

      <main className="main">
        {notice && (
          <div className="notice" role="status">
            <span>{notice}</span>
            <button onClick={retrySync}>Retry sync</button>
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button>
          </div>
        )}
        {storageMode === "loading" ? <p className="loading-state">Loading your posts...</p> : null}
        {view === "dashboard" && (
          <Dashboard posts={posts} onCreatePost={() => showView("create")} onViewPosts={() => showView("posts")} />
        )}

        {view === "create" && (
          <CreatePost
            initialDate={focusDate ?? ""}
            onSchedule={handleSchedule}
            posts={posts}
          />
        )}

        {view === "calendar" && (
          <Calendar
            key={focusDate || "calendar"}
            posts={posts}
            initialDate={focusDate}
            onCreatePost={(date) => showView("create", date)}
          />
        )}
        {view === "posts" && <Posts posts={posts} onDelete={handleDelete} onUpdate={handleUpdatePost} />}
      </main>
    </div>
  );
}

export default App;

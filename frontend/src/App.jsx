import { useEffect, useState } from "react";
import "./App.css";
import Calendar from "./Calendar";
import CreatePost from "./CreatePost";
import { createPost, deletePost, getLocalPosts, getPosts, saveLocalPosts } from "./api";
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
  const published = posts.length - scheduled;
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

function Posts({ posts, onDelete }) {
  const [filter, setFilter] = useState("All posts");
  const filteredPosts = [...posts]
    .filter((post) => filter === "All posts" || getPostStatus(post) === filter)
    .sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));

  return (
    <>
      <header className="posts-header">
        <div>
          <h1>Posts</h1>
          <p className="page-subtitle">Review and manage your content schedule.</p>
        </div>
        <label className="filter-control">
          <span className="visually-hidden">Filter posts</span>
          <select value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option>All posts</option>
            <option>Scheduled</option>
            <option>Published</option>
          </select>
        </label>
      </header>
      <section className="post-list" aria-live="polite">
        {filteredPosts.length ? filteredPosts.map((post) => {
          const status = getPostStatus(post);
          return (
            <article className="managed-post" key={post.id}>
              {post.image && <img src={post.image} alt="" />}
              <div className="managed-post-content">
                <div className="managed-post-meta">
                  <span className="platform-dot" style={{ background: PLATFORM_COLORS[post.platform] }} />
                  <strong>{post.platform}</strong>
                  <span>{formatPostDate(post)}</span>
                  <span className={`status ${status.toLowerCase()}`}>{status}</span>
                </div>
                <p>{post.caption}</p>
              </div>
              <button className="delete-button" onClick={() => onDelete(post)} aria-label={`Delete post: ${post.caption}`}>
                Delete
              </button>
            </article>
          );
        }) : <p className="empty-state">No posts match this view.</p>}
      </section>
    </>
  );
}

function App() {
  const [view, setView] = useState("dashboard");
  const [posts, setPosts] = useState([]);
  const [storageMode, setStorageMode] = useState("loading");
  const [notice, setNotice] = useState("");
  // Date ("YYYY-MM-DD") to open the next view on: prefills Create Post's
  // date, or picks the month and day the Calendar starts on.
  const [focusDate, setFocusDate] = useState(null);

  const showView = (nextView, date = null) => {
    setFocusDate(date);
    setView(nextView);
  };

  useEffect(() => {
    getPosts()
      .then((savedPosts) => {
        setPosts(savedPosts);
        saveLocalPosts(savedPosts);
        setStorageMode("server");
      })
      .catch(() => {
        setPosts(getLocalPosts());
        setStorageMode("local");
        setNotice("Backend unavailable. Posts are being saved in this browser only.");
      });
  }, []);

  const handleSchedule = async (post) => {
    if (storageMode === "server") {
      try {
        const savedPost = await createPost(post);
        setPosts((current) => {
          const updatedPosts = [...current, savedPost];
          saveLocalPosts(updatedPosts);
          return updatedPosts;
        });
      } catch {
        const localPost = { ...post, id: crypto.randomUUID() };
        setPosts((current) => {
          const updatedPosts = [...current, localPost];
          saveLocalPosts(updatedPosts);
          return updatedPosts;
        });
        setStorageMode("local");
        setNotice("Could not reach the backend. This post was saved in this browser only.");
      }
    } else {
      const localPost = { ...post, id: crypto.randomUUID() };
      setPosts((current) => {
        const updatedPosts = [...current, localPost];
        saveLocalPosts(updatedPosts);
        return updatedPosts;
      });
    }
    showView("calendar", post.date);
  };

  const handleDelete = async (post) => {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;

    if (storageMode === "server") {
      try {
        await deletePost(post.id);
      } catch {
        setNotice("Could not delete the post because the backend is unavailable.");
        return;
      }
      setPosts((current) => {
        const updatedPosts = current.filter((item) => item.id !== post.id);
        saveLocalPosts(updatedPosts);
        return updatedPosts;
      });
      return;
    }

    setPosts((current) => {
      const updatedPosts = current.filter((item) => item.id !== post.id);
      saveLocalPosts(updatedPosts);
      return updatedPosts;
    });
  };

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
      </aside>

      <main className="main">
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss notice">×</button></div>}
        {storageMode === "loading" ? <p className="loading-state">Loading your posts...</p> : null}
        {view === "dashboard" && (
          <Dashboard posts={posts} onCreatePost={() => showView("create")} onViewPosts={() => showView("posts")} />
        )}

        {view === "create" && (
          <CreatePost
            initialDate={focusDate ?? ""}
            onSchedule={handleSchedule}
          />
        )}

        {view === "calendar" && (
          <Calendar
            posts={posts}
            initialDate={focusDate}
            onCreatePost={(date) => showView("create", date)}
          />
        )}
        {view === "posts" && <Posts posts={posts} onDelete={handleDelete} />}
      </main>
    </div>
  );
}

export default App;

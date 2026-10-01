import { useState } from "react";
import "./App.css";
import Calendar from "./Calendar";
import CreatePost from "./CreatePost";
import { samplePosts } from "./posts";

function Dashboard({ onCreatePost }) {
  return (
    <>
      <header>
        <h1>Dashboard</h1>

        <button onClick={onCreatePost}>
          Create Post
        </button>
      </header>

      <section className="stats">
        <div className="card">
          <h3>Total Posts</h3>
          <h2>24</h2>
        </div>

        <div className="card">
          <h3>Scheduled</h3>
          <h2>8</h2>
        </div>

        <div className="card">
          <h3>Published</h3>
          <h2>16</h2>
        </div>
      </section>

      <section className="recent">
        <h2>Recent Posts</h2>

        <div className="post">
          <div>
            <strong>Instagram Campaign</strong>
            <p>Scheduled for tomorrow at 10:00 AM</p>
          </div>

          <span>Scheduled</span>
        </div>

        <div className="post">
          <div>
            <strong>Product Launch</strong>
            <p>Published today at 12:00 PM</p>
          </div>

          <span>Published</span>
        </div>
      </section>
    </>
  );
}

function App() {
  const [view, setView] = useState("dashboard");
  const [posts, setPosts] = useState(samplePosts);
  // Date ("YYYY-MM-DD") to open the next view on: prefills Create Post's
  // date, or picks the month and day the Calendar starts on.
  const [focusDate, setFocusDate] = useState(null);

  const showView = (nextView, date = null) => {
    setFocusDate(date);
    setView(nextView);
  };

  const handleSchedule = (post) => {
    setPosts((current) => [...current, { ...post, id: crypto.randomUUID() }]);
    showView("calendar", post.date);
  };

  const navClass = (navView) => (view === navView ? "active" : undefined);

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>SocialFlow</h2>

        <nav>
          <p className={navClass("dashboard")} onClick={() => showView("dashboard")}>
            📊 Dashboard
          </p>

          <p className={navClass("create")} onClick={() => showView("create")}>
            ➕ Create Post
          </p>

          <p className={navClass("calendar")} onClick={() => showView("calendar")}>
            📅 Calendar
          </p>

          <p>📝 Posts</p>
          <p>⚙️ Settings</p>
        </nav>
      </aside>

      <main className="main">
        {view === "dashboard" && (
          <Dashboard onCreatePost={() => showView("create")} />
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
      </main>
    </div>
  );
}

export default App;

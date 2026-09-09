import { useState } from "react";
import "./App.css";
import CreatePost from "./CreatePost";

function App() {
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Create Post page
  if (showCreatePost) {
    return (
      <CreatePost onBack={() => setShowCreatePost(false)} />
    );
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <h2>SocialFlow</h2>

        <nav>
          <p>📊 Dashboard</p>

          <p onClick={() => setShowCreatePost(true)}>
            ➕ Create Post
          </p>

          <p>📅 Calendar</p>
          <p>📝 Posts</p>
          <p>⚙️ Settings</p>
        </nav>
      </aside>

      <main className="main">
        <header>
          <h1>Dashboard</h1>

          <button onClick={() => setShowCreatePost(true)}>
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
      </main>
    </div>
  );
}

export default App;
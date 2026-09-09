import { useState } from "react";

function CreatePost() {
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!caption || !date || !time) {
      alert("Please fill all required fields");
      return;
    }

    alert("Post scheduled successfully!");

    console.log({
      platform,
      caption,
      date,
      time,
    });
  };

  return (
    <div className="create-post">
      <h1>Create Post</h1>

      <form onSubmit={handleSubmit}>
        <label>Platform</label>

        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option>Instagram</option>
          <option>Facebook</option>
          <option>LinkedIn</option>
          <option>Twitter / X</option>
        </select>

        <label>Caption</label>

        <textarea
          placeholder="Write your post caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows="6"
        />

        <label>Image</label>

        <input type="file" accept="image/*" />

        <label>Date</label>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label>Time</label>

        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        <button type="submit">
          Schedule Post
        </button>
      </form>
    </div>
  );
}

export default CreatePost;
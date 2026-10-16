import { useState } from "react";
import { toDateKey } from "./posts";

function CreatePost({ initialDate = "", onSchedule }) {
  const [caption, setCaption] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("");
  const [image, setImage] = useState("");
  const [error, setError] = useState("");
  const today = toDateKey(new Date());

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!caption.trim() || !date || !time) {
      setError("Add a caption, date, and time before scheduling.");
      return;
    }

    if (new Date(`${date}T${time}`) < new Date()) {
      setError("Choose a time in the future.");
      return;
    }

    setError("");
    await onSchedule({ platform, caption: caption.trim(), image: image.trim(), date, time });
  };

  return (
    <div className="create-post">
      <h1>Create Post</h1>

      <form onSubmit={handleSubmit}>
        <label>Platform</label>

        <select
           id="post-platform"
           required
          value={platform}
          onChange={(e) => setPlatform(e.target.value)}
        >
          <option>Instagram</option>
          <option>Facebook</option>
          <option>LinkedIn</option>
          <option>Twitter / X</option>
        </select>

        <label htmlFor="post-caption">Caption</label>

        <textarea
           id="post-caption"
           required
           maxLength={2200}
          placeholder="Write your post caption..."
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows="6"
        />
        <span className="field-hint">{caption.length} / 2,200 characters</span>

        <label htmlFor="post-image">Image URL</label>

        <input id="post-image" type="url" placeholder="https://example.com/image.jpg" value={image} onChange={(e) => setImage(e.target.value)} />
        {image && <img className="image-preview" src={image} alt="Post preview" onError={(event) => { event.currentTarget.hidden = true; }} />}

        <label htmlFor="post-date">Date</label>

        <input
          id="post-date"
          type="date"
          min={today}
            required
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />

        <label htmlFor="post-time">Time</label>

        <input
          id="post-time"
          type="time"
          required
          value={time}
          onChange={(e) => setTime(e.target.value)}
        />

        {error && <p className="form-error" role="alert">{error}</p>}
        <button type="submit">Schedule Post</button>
      </form>
    </div>
  );
}

export default CreatePost;
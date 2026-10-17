import { useMemo, useRef, useState } from "react";
import { uploadImage } from "./api";
import {
  HASHTAG_PRESETS,
  HOOK_PRESETS,
  PLATFORM_INFO,
  STOCK_IMAGE_PRESETS,
  getNextQueueSlot,
  getOptimalTimeSuggestions,
  toDateKey,
} from "./posts";

function formatCaptionWithHashtags(text) {
  if (!text) return "";
  const parts = text.split(/(#[a-zA-Z0-9_]+)/g);
  return parts.map((part, index) => {
    if (part.startsWith("#")) {
      return (
        <span key={index} className="preview-hashtag">
          {part}
        </span>
      );
    }
    return part;
  });
}

function CreatePost({ initialDate = "", onSchedule, posts = [] }) {
  const [selectedPlatforms, setSelectedPlatforms] = useState(["Instagram", "LinkedIn"]);
  const [activePreviewPlatform, setActivePreviewPlatform] = useState("Instagram");
  const [caption, setCaption] = useState("");
  const [firstComment, setFirstComment] = useState("");
  const [showFirstComment, setShowFirstComment] = useState(false);
  const [image, setImage] = useState("");
  const [mediaTab, setMediaTab] = useState("device"); // "device" | "url" | "presets"
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState("");
  const fileInputRef = useRef(null);

  const [scheduleMode, setScheduleMode] = useState("smart_queue"); // "smart_queue" | "optimal_time" | "custom"
  const [date, setDate] = useState(initialDate || toDateKey(new Date()));
  const [time, setTime] = useState("09:30");
  const [optimalTimeIndex, setOptimalTimeIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Interactive mockup states
  const [instagramLiked, setInstagramLiked] = useState(false);
  const [likedCount, setLikedCount] = useState(1420);

  const today = toDateKey(new Date());

  // Smart queue next available slot
  const nextQueueSlot = useMemo(() => getNextQueueSlot(posts), [posts]);

  // Optimal timing suggestions (recalculate if day boundary crossed)
  const optimalTimeSuggestions = useMemo(() => getOptimalTimeSuggestions(), [today]);

  // When scheduleMode changes, sync date and time
  const selectScheduleMode = (mode) => {
    setScheduleMode(mode);
    if (mode === "smart_queue") {
      setDate(nextQueueSlot.date);
      setTime(nextQueueSlot.time);
    } else if (mode === "optimal_time" && optimalTimeSuggestions.length > 0) {
      const chosen = optimalTimeSuggestions[optimalTimeIndex] || optimalTimeSuggestions[0];
      setDate(chosen.date);
      setTime(chosen.time);
    }
  };

  const handleSelectOptimalTime = (index) => {
    setOptimalTimeIndex(index);
    const chosen = optimalTimeSuggestions[index];
    if (chosen) {
      setDate(chosen.date);
      setTime(chosen.time);
    }
  };

  const togglePlatform = (plat) => {
    if (selectedPlatforms.includes(plat)) {
      if (selectedPlatforms.length === 1) {
        setError("At least one social platform must remain selected.");
        return;
      }
      const updated = selectedPlatforms.filter((p) => p !== plat);
      setSelectedPlatforms(updated);
      if (activePreviewPlatform === plat) {
        setActivePreviewPlatform(updated[0]);
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, plat]);
      setActivePreviewPlatform(plat);
    }
    setError("");
  };

  const insertHashtag = (tag) => {
    if (!caption.includes(tag)) {
      setCaption((prev) => (prev ? `${prev.trim()} ${tag}` : tag));
    }
  };

  const insertHook = (hookText) => {
    setCaption((prev) => (prev ? `${hookText}\n\n${prev}` : hookText));
  };

  const handleFileUpload = async (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setUploadError("Please upload an image file (PNG, JPG, WebP, GIF, or SVG).");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setUploadError("Image file size exceeds the 10MB limit.");
      return;
    }

    try {
      setIsUploading(true);
      setUploadError("");
      const result = await uploadImage(file);
      setImage(result.url);
      setUploadedFileName(file.name);
    } catch (err) {
      setUploadError(err.message || "Failed to upload image from your device.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileUpload(file);
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  };

  const handleRemoveMedia = () => {
    setImage("");
    setUploadedFileName("");
    setUploadError("");
  };

  const activePlatformInfo = PLATFORM_INFO[activePreviewPlatform] || PLATFORM_INFO.Instagram;
  const currentPlatformLimit = activePlatformInfo.charLimit;
  const charRemaining = currentPlatformLimit - caption.length;
  const isOverLimit = charRemaining < 0;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (selectedPlatforms.length === 0) {
      setError("Please select at least one social media channel.");
      return;
    }

    if (!caption.trim()) {
      setError("Please write a post caption before scheduling.");
      return;
    }

    let finalDate = date;
    let finalTime = time;

    if (scheduleMode === "smart_queue") {
      finalDate = nextQueueSlot.date;
      finalTime = nextQueueSlot.time;
    } else if (scheduleMode === "optimal_time") {
      const chosen = optimalTimeSuggestions[optimalTimeIndex];
      if (chosen) {
        finalDate = chosen.date;
        finalTime = chosen.time;
      }
    }

    if (!finalDate || !finalTime) {
      setError("Please specify a valid scheduled date and time.");
      return;
    }

    const scheduledDateObj = new Date(`${finalDate}T${finalTime}`);
    if (scheduledDateObj <= new Date()) {
      setError("Choose a scheduled time in the future.");
      return;
    }

    // Check character limits for selected platforms
    for (const plat of selectedPlatforms) {
      const limit = PLATFORM_INFO[plat]?.charLimit || 2200;
      if (caption.length > limit) {
        setError(`Caption exceeds the ${limit} character limit for ${plat}.`);
        return;
      }
    }

    setError("");
    setIsSubmitting(true);

    try {
      const itemsToSchedule = selectedPlatforms.map((plat) => ({
        platform: plat,
        caption: caption.trim(),
        image: image.trim(),
        firstComment: firstComment.trim(),
        date: finalDate,
        time: finalTime,
        timezoneOffsetMinutes: scheduledDateObj.getTimezoneOffset(),
      }));

      await onSchedule(itemsToSchedule);
    } catch (err) {
      setError(err?.message || "Failed to schedule post.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="composer-container">
      {/* Header Bar */}
      <div className="composer-header">
        <div>
          <div className="badge-row">
            <span className="badge-pill queue-pill">⚡ Smart Queue</span>
            <span className="badge-pill optimal-pill">🧠 AI Best Time</span>
          </div>
          <h1>Multi-Channel Post Composer</h1>
          <p className="composer-subtitle">
            Draft once, preview realistically, and schedule across your brand channels with intelligent timing.
          </p>
        </div>

        <div className="channel-summary-badge">
          <span>{selectedPlatforms.length}</span> channel{selectedPlatforms.length > 1 ? "s" : ""} selected
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="composer-grid">
        {/* Left Column: Composer Controls */}
        <div className="composer-editor-card">
          {/* Channel Selector */}
          <section className="composer-section">
            <label className="section-title">Target Channels</label>
            <p className="section-description">Select the social channels to publish this post simultaneously:</p>

            <div className="platform-selector-group">
              {Object.keys(PLATFORM_INFO).map((platKey) => {
                const info = PLATFORM_INFO[platKey];
                const isSelected = selectedPlatforms.includes(platKey);
                return (
                  <button
                    key={platKey}
                    type="button"
                    className={`platform-pill ${isSelected ? "selected" : ""}`}
                    onClick={() => togglePlatform(platKey)}
                    aria-pressed={isSelected}
                  >
                    <span
                      className="platform-dot"
                      style={{ background: info.color }}
                    />
                    <div className="platform-pill-text">
                      <strong className="platform-name">{info.name}</strong>
                      <span className="platform-handle">{info.handle}</span>
                    </div>
                    <span className="pill-checkbox">
                      {isSelected ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Quick Hook Starters */}
          <section className="composer-section">
            <div className="section-title-row">
              <label className="section-title">Caption Hook Ideas</label>
              <span className="section-hint">Click to insert starter</span>
            </div>
            <div className="hook-chips">
              {HOOK_PRESETS.map((hook, i) => (
                <button
                  key={i}
                  type="button"
                  className="hook-chip"
                  onClick={() => insertHook(hook.text)}
                  title="Click to insert starter hook"
                >
                  {hook.label}
                </button>
              ))}
            </div>
          </section>

          {/* Caption Editor */}
          <section className="composer-section">
            <div className="section-title-row">
              <label htmlFor="post-caption" className="section-title">
                Post Caption
              </label>
              <span className={`char-meter ${isOverLimit ? "over-limit" : charRemaining < 50 ? "near-limit" : ""}`}>
                {caption.length} / {currentPlatformLimit} chars ({activePreviewPlatform})
              </span>
            </div>

            <textarea
              id="post-caption"
              required
              rows="6"
              className={`composer-textarea ${isOverLimit ? "input-error" : ""}`}
              placeholder="What do you want to share with your audience? Tip: Use #hashtags and @mentions for extra reach..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />

            {/* Hashtag Suggestions */}
            <div className="hashtag-row">
              <span className="hashtag-label">Popular Tags:</span>
              <div className="hashtag-chips">
                {HASHTAG_PRESETS.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="hashtag-chip"
                    onClick={() => insertHashtag(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* First Comment Feature */}
          <section className="composer-section">
            <div className="first-comment-toggle-bar">
              <button
                type="button"
                className="first-comment-toggle-btn"
                onClick={() => setShowFirstComment(!showFirstComment)}
              >
                <span>💬 {showFirstComment ? "Hide First Comment" : "Add First Comment (Instagram & LinkedIn)"}</span>
                <span className="toggle-indicator">{showFirstComment ? "▲" : "▼"}</span>
              </button>
              <span className="field-hint">Great for keeping links & 30 hashtags out of the main post</span>
            </div>

            {showFirstComment && (
              <div className="first-comment-panel">
                <label htmlFor="post-first-comment" className="sublabel">
                  First Comment
                </label>
                <textarea
                  id="post-first-comment"
                  rows="3"
                  className="composer-textarea sub-textarea"
                  placeholder="Drop your extra hashtags or blog links here to keep your main caption clean..."
                  value={firstComment}
                  onChange={(e) => setFirstComment(e.target.value)}
                />
              </div>
            )}
          </section>

          {/* Media Attachments */}
          <section className="composer-section">
            <div className="section-title-row">
              <label className="section-title">
                Media Attachment
              </label>
              {image && (
                <button
                  type="button"
                  className="clear-media-link"
                  onClick={handleRemoveMedia}
                >
                  ✕ Clear image
                </button>
              )}
            </div>

            {/* Media Source Tabs */}
            <div className="media-tabs-bar">
              <button
                type="button"
                className={`media-tab-btn ${mediaTab === "device" ? "active" : ""}`}
                onClick={() => setMediaTab("device")}
              >
                📁 Upload from Device
              </button>
              <button
                type="button"
                className={`media-tab-btn ${mediaTab === "url" ? "active" : ""}`}
                onClick={() => setMediaTab("url")}
              >
                🔗 Image URL
              </button>
              <button
                type="button"
                className={`media-tab-btn ${mediaTab === "presets" ? "active" : ""}`}
                onClick={() => setMediaTab("presets")}
              >
                🎨 Demo Visuals
              </button>
            </div>

            {/* Tab 1: System Device Upload */}
            {mediaTab === "device" && (
              <div className="system-upload-container">
                <input
                  type="file"
                  ref={fileInputRef}
                  style={{ display: "none" }}
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                  onChange={handleFileInputChange}
                />

                <div
                  className={`upload-dropzone ${isDragging ? "drag-active" : ""} ${isUploading ? "uploading" : ""}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                >
                  {isUploading ? (
                    <div className="upload-progress-state">
                      <div className="upload-spinner" />
                      <p className="upload-progress-text">Uploading image from your device...</p>
                    </div>
                  ) : (
                    <div className="upload-idle-state">
                      <div className="upload-icon-circle">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="17 8 12 3 7 8" />
                          <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                      </div>
                      <div className="upload-prompt-content">
                        <p className="upload-prompt-main">
                          <strong>Choose an image</strong> or drag & drop here
                        </p>
                        <p className="upload-prompt-sub">
                          JPEG, PNG, WebP, GIF, SVG (up to 10MB)
                        </p>
                      </div>
                      <button
                        type="button"
                        className="upload-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          fileInputRef.current?.click();
                        }}
                      >
                        Browse Files
                      </button>
                    </div>
                  )}
                </div>

                {uploadError && (
                  <div className="upload-error-alert">
                    <span>⚠️ {uploadError}</span>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: URL */}
            {mediaTab === "url" && (
              <div className="url-input-container">
                <input
                  id="post-image"
                  type="url"
                  className="composer-input"
                  placeholder="https://example.com/photo.jpg"
                  value={image}
                  onChange={(e) => {
                    setImage(e.target.value);
                    setUploadedFileName("");
                  }}
                />
                <span className="field-hint">Paste any direct public image URL</span>
              </div>
            )}

            {/* Tab 3: Presets */}
            {mediaTab === "presets" && (
              <div className="stock-presets-container">
                <span className="stock-label">Or choose a high-res demo visual:</span>
                <div className="stock-presets-grid">
                  {STOCK_IMAGE_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`stock-thumbnail-btn ${image === preset.url ? "active" : ""}`}
                      onClick={() => {
                        setImage(preset.url);
                        setUploadedFileName(preset.title);
                      }}
                      title={preset.title}
                    >
                      <img src={preset.url} alt={preset.title} />
                      <span className="stock-name">{preset.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Media Preview Card */}
            {image && (
              <div className="active-media-preview">
                <img
                  src={image}
                  alt="Attachment preview"
                  onError={(e) => {
                    e.currentTarget.hidden = true;
                  }}
                />
                <div className="media-preview-bar">
                  <span className="media-filename-tag">
                    {uploadedFileName || (image.startsWith("/uploads/") ? "Uploaded Local Image" : image.length > 40 ? `${image.slice(0, 37)}...` : image)}
                  </span>
                  <button
                    type="button"
                    className="remove-media-btn"
                    onClick={handleRemoveMedia}
                    title="Remove image"
                  >
                    ✕ Remove
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Intelligent Scheduling Engine (Smart Queue vs AI Best Time vs Custom) */}
          <section className="composer-section schedule-engine-card">
            <label className="section-title">Publishing Schedule Mode</label>
            <div className="schedule-tabs">
              <button
                type="button"
                className={`schedule-tab-btn ${scheduleMode === "smart_queue" ? "active" : ""}`}
                onClick={() => selectScheduleMode("smart_queue")}
              >
                ⚡ Smart Queue
              </button>

              <button
                type="button"
                className={`schedule-tab-btn ${scheduleMode === "optimal_time" ? "active" : ""}`}
                onClick={() => selectScheduleMode("optimal_time")}
              >
                🧠 Best Time (AI Optimized)
              </button>

              <button
                type="button"
                className={`schedule-tab-btn ${scheduleMode === "custom" ? "active" : ""}`}
                onClick={() => selectScheduleMode("custom")}
              >
                🗓️ Custom Date & Time
              </button>
            </div>

            {/* Smart Queue View */}
            {scheduleMode === "smart_queue" && (
              <div className="queue-slot-banner">
                <div className="queue-slot-content">
                  <div className="queue-icon-ring">⚡</div>
                  <div>
                    <strong>Smart Queue Cadence</strong>
                    <p>
                      Slots your post into your brand's next open cadence slot:
                    </p>
                    <div className="recommended-slot-pill">
                      {nextQueueSlot.formatted}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Optimal Best Time View */}
            {scheduleMode === "optimal_time" && (
              <div className="smartq-container">
                <p className="smartq-helper-text">
                  Our scheduling intelligence analyzes audience activity to recommend optimal reach windows:
                </p>
                <div className="smartq-cards">
                  {optimalTimeSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`smartq-card ${optimalTimeIndex === idx ? "active" : ""}`}
                      onClick={() => handleSelectOptimalTime(idx)}
                    >
                      <div className="smartq-badge">{item.badge}</div>
                      <div className="smartq-time">{item.label}</div>
                      <div className="smartq-score">{item.score}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Custom Schedule View */}
            {scheduleMode === "custom" && (
              <div className="custom-schedule-fields">
                <div className="schedule-field">
                  <label htmlFor="post-date">Publish Date</label>
                  <input
                    id="post-date"
                    type="date"
                    min={today}
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                  />
                </div>

                <div className="schedule-field">
                  <label htmlFor="post-time">Publish Time</label>
                  <input
                    id="post-time"
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                  />
                </div>
              </div>
            )}
          </section>

          {/* Form Error Banner */}
          {error && (
            <div className="composer-error-banner" role="alert">
              <span>⚠️ {error}</span>
            </div>
          )}

          {/* Submit Actions */}
          <div className="composer-submit-bar">
            <button
              type="button"
              className="primary-schedule-button"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Scheduling..."
                : scheduleMode === "smart_queue"
                ? `Add to Queue (${selectedPlatforms.length} Channel${selectedPlatforms.length > 1 ? "s" : ""})`
                : scheduleMode === "optimal_time"
                ? `Schedule via Best Time (${selectedPlatforms.length} Channel${selectedPlatforms.length > 1 ? "s" : ""})`
                : `Schedule Post (${selectedPlatforms.length} Channel${selectedPlatforms.length > 1 ? "s" : ""})`}
            </button>
          </div>
        </div>

        {/* Right Column: Live Interactive Social Mockup Simulator */}
        <div className="mockup-simulator-card">
          <div className="mockup-header-bar">
            <div className="mockup-title-wrap">
              <span className="live-dot" />
              <h3>Live Channel Simulator</h3>
            </div>

            {/* Tab switchers to preview different selected networks */}
            <div className="preview-channel-tabs">
              {selectedPlatforms.map((platKey) => {
                const info = PLATFORM_INFO[platKey];
                const isActive = activePreviewPlatform === platKey;
                return (
                  <button
                    key={platKey}
                    type="button"
                    className={`preview-tab-btn ${isActive ? "active" : ""}`}
                    onClick={() => setActivePreviewPlatform(platKey)}
                    style={{
                      borderColor: isActive ? info.color : "transparent",
                    }}
                  >
                    <span
                      className="platform-dot-tiny"
                      style={{ background: info.color }}
                    />
                    {info.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mockup-canvas">
            {/* INSTAGRAM MOCKUP */}
            {activePreviewPlatform === "Instagram" && (
              <div className="instagram-mockup-frame">
                {/* Header */}
                <div className="mockup-profile-header">
                  <div className="avatar-wrap">
                    <img
                      src={activePlatformInfo.avatar}
                      alt="Avatar"
                      className="instagram-avatar"
                    />
                    <div className="avatar-ring" />
                  </div>
                  <div className="profile-identity">
                    <span className="identity-name">{activePlatformInfo.handle}</span>
                    <span className="identity-sub">Original audio · San Francisco, CA</span>
                  </div>
                  <button type="button" className="mockup-more-btn">•••</button>
                </div>

                {/* Media Container */}
                <div className="mockup-media-viewport">
                  {image ? (
                    <img src={image} alt="Preview" className="mockup-media-img" />
                  ) : (
                    <div className="mockup-media-placeholder ig-placeholder">
                      <div className="placeholder-icon">📸</div>
                      <span>Visual Preview</span>
                      <small>Attach an image or choose a demo preset on the left</small>
                    </div>
                  )}
                </div>

                {/* Instagram Action Row */}
                <div className="instagram-action-row">
                  <div className="ig-actions-left">
                    <button
                      type="button"
                      className={`ig-action-btn ${instagramLiked ? "liked" : ""}`}
                      onClick={() => {
                        setInstagramLiked(!instagramLiked);
                        setLikedCount((c) => (instagramLiked ? c - 1 : c + 1));
                      }}
                      title="Like post"
                    >
                      {instagramLiked ? "❤️" : "🤍"}
                    </button>
                    <button type="button" className="ig-action-btn" title="Comment">
                      💬
                    </button>
                    <button type="button" className="ig-action-btn" title="Share">
                      ✈️
                    </button>
                  </div>
                  <button type="button" className="ig-action-btn" title="Save">
                    🔖
                  </button>
                </div>

                {/* Likes count */}
                <div className="ig-likes-line">
                  Liked by <strong>alex_design</strong> and <strong>{likedCount.toLocaleString()} others</strong>
                </div>

                {/* Instagram Caption */}
                <div className="mockup-caption-body">
                  <strong className="caption-author">{activePlatformInfo.handle}</strong>{" "}
                  <span className="caption-text">
                    {caption ? formatCaptionWithHashtags(caption) : "Your captivating Instagram caption will appear right here..."}
                  </span>
                </div>

                {/* First Comment if available */}
                {firstComment && (
                  <div className="ig-first-comment-bubble">
                    <span className="comment-badge">First comment</span>
                    <strong>{activePlatformInfo.handle}</strong>{" "}
                    <span>{formatCaptionWithHashtags(firstComment)}</span>
                  </div>
                )}

                <div className="mockup-timestamp">
                  Scheduled for {date} at {time}
                </div>
              </div>
            )}

            {/* TWITTER / X MOCKUP */}
            {activePreviewPlatform === "Twitter / X" && (
              <div className="x-mockup-frame">
                <div className="x-author-row">
                  <img
                    src={activePlatformInfo.avatar}
                    alt="X Avatar"
                    className="x-avatar"
                  />
                  <div className="x-meta">
                    <div className="x-name-line">
                      <span className="x-display-name">{activePlatformInfo.displayName}</span>
                      <span className="x-verified-badge" title="Verified">✓</span>
                      <span className="x-handle">{activePlatformInfo.handle}</span>
                      <span className="x-dot">·</span>
                      <span className="x-time">Just now</span>
                    </div>

                    <div className="x-body-text">
                      {caption ? formatCaptionWithHashtags(caption) : "What is happening? Your post for X / Twitter will appear here..."}
                    </div>

                    {image && (
                      <div className="x-media-card">
                        <img src={image} alt="Tweet media" className="x-media-img" />
                      </div>
                    )}

                    <div className="x-metrics-bar">
                      <span className="x-metric">💬 24</span>
                      <span className="x-metric">🔁 58</span>
                      <span className="x-metric">❤️ 382</span>
                      <span className="x-metric">📊 4.9K</span>
                      <span className="x-metric">🔗</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* LINKEDIN MOCKUP */}
            {activePreviewPlatform === "LinkedIn" && (
              <div className="linkedin-mockup-frame">
                <div className="linkedin-header">
                  <img
                    src={activePlatformInfo.avatar}
                    alt="LinkedIn avatar"
                    className="linkedin-avatar"
                  />
                  <div className="linkedin-profile-text">
                    <div className="linkedin-name-row">
                      <strong className="linkedin-name">{activePlatformInfo.displayName}</strong>
                      <span className="linkedin-degree">• 1st</span>
                    </div>
                    <span className="linkedin-headline">{activePlatformInfo.role}</span>
                    <span className="linkedin-time">Just now • 🌐</span>
                  </div>
                  <button type="button" className="mockup-more-btn">•••</button>
                </div>

                <div className="linkedin-body-text">
                  {caption ? formatCaptionWithHashtags(caption) : "Share insights, industry developments, or team announcements with your LinkedIn network..."}
                </div>

                {image && (
                  <div className="linkedin-media-box">
                    <img src={image} alt="LinkedIn media" className="linkedin-media-img" />
                  </div>
                )}

                {firstComment && (
                  <div className="linkedin-comment-preview">
                    <div className="comment-pill-tag">Pinned First Comment</div>
                    <p>{firstComment}</p>
                  </div>
                )}

                <div className="linkedin-reactions-counter">
                  <span className="reaction-emojis">👍 💡 ❤️ 164</span>
                  <span className="reaction-stats">28 comments · 12 reposts</span>
                </div>

                <div className="linkedin-action-bar">
                  <button type="button" className="li-action-btn">👍 Like</button>
                  <button type="button" className="li-action-btn">💬 Comment</button>
                  <button type="button" className="li-action-btn">🔁 Repost</button>
                  <button type="button" className="li-action-btn">✈️ Send</button>
                </div>
              </div>
            )}

            {/* FACEBOOK MOCKUP */}
            {activePreviewPlatform === "Facebook" && (
              <div className="facebook-mockup-frame">
                <div className="facebook-header">
                  <img
                    src={activePlatformInfo.avatar}
                    alt="Facebook avatar"
                    className="facebook-avatar"
                  />
                  <div className="facebook-profile-text">
                    <strong className="facebook-name">{activePlatformInfo.displayName}</strong>
                    <span className="facebook-sub">Just now · 🌐 Public</span>
                  </div>
                  <button type="button" className="mockup-more-btn">•••</button>
                </div>

                <div className="facebook-body-text">
                  {caption ? formatCaptionWithHashtags(caption) : "Write a post to update your Facebook community and page followers..."}
                </div>

                {image && (
                  <div className="facebook-media-box">
                    <img src={image} alt="Facebook media" className="facebook-media-img" />
                  </div>
                )}

                <div className="facebook-stats-line">
                  <span>👍 ❤️ 248</span>
                  <span>42 comments · 19 shares</span>
                </div>

                <div className="facebook-action-bar">
                  <button type="button" className="fb-action-btn">👍 Like</button>
                  <button type="button" className="fb-action-btn">💬 Comment</button>
                  <button type="button" className="fb-action-btn">↗️ Share</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CreatePost;
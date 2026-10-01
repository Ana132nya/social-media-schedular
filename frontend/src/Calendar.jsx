import { useMemo, useState } from "react";
import { PLATFORM_COLORS, getPostStatus, toDateKey } from "./posts";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_CHIPS = 3;

function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);

  return new Date(year, month - 1, day);
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

// Every day shown in the grid: from the Sunday on or before the 1st to the
// Saturday on or after the last day of the month.
function getMonthDays(month) {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const leadingDays = month.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalDays = Math.ceil((leadingDays + daysInMonth) / 7) * 7;

  return Array.from(
    { length: totalDays },
    (_, i) => new Date(year, monthIndex, 1 - leadingDays + i)
  );
}

function formatTime(post) {
  return new Date(`${post.date}T${post.time}`).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDay(date) {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function Calendar({ posts, initialDate, onCreatePost }) {
  const todayKey = toDateKey(new Date());

  const [selectedKey, setSelectedKey] = useState(initialDate || todayKey);
  const [month, setMonth] = useState(() =>
    startOfMonth(parseDateKey(initialDate || todayKey))
  );

  const postsByDay = useMemo(() => {
    const groups = {};

    for (const post of posts) {
      groups[post.date] ??= [];
      groups[post.date].push(post);
    }

    for (const dayPosts of Object.values(groups)) {
      dayPosts.sort((a, b) => a.time.localeCompare(b.time));
    }

    return groups;
  }, [posts]);

  const changeMonth = (offset) => {
    setMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + offset, 1)
    );
  };

  const goToToday = () => {
    setMonth(startOfMonth(new Date()));
    setSelectedKey(todayKey);
  };

  const selectDay = (day) => {
    setSelectedKey(toDateKey(day));

    // Clicking a greyed-out day from a neighbouring month jumps to that month.
    if (day.getMonth() !== month.getMonth()) {
      setMonth(startOfMonth(day));
    }
  };

  const selectedPosts = postsByDay[selectedKey] ?? [];

  return (
    <>
      <header>
        <h1>Calendar</h1>

        <button onClick={() => onCreatePost()}>
          Create Post
        </button>
      </header>

      <div className="calendar-layout">
        <section className="calendar">
          <div className="calendar-toolbar">
            <h2>
              {month.toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </h2>

            <button onClick={goToToday}>Today</button>

            <button onClick={() => changeMonth(-1)} aria-label="Previous month">
              ‹
            </button>

            <button onClick={() => changeMonth(1)} aria-label="Next month">
              ›
            </button>
          </div>

          <div className="calendar-weekdays">
            {WEEKDAYS.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>

          <div className="calendar-grid">
            {getMonthDays(month).map((day) => {
              const key = toDateKey(day);
              const dayPosts = postsByDay[key] ?? [];
              const hiddenCount = dayPosts.length - MAX_CHIPS;

              const classNames = ["calendar-day"];
              if (day.getMonth() !== month.getMonth()) classNames.push("outside");
              if (key === todayKey) classNames.push("today");
              if (key === selectedKey) classNames.push("selected");

              return (
                <button
                  key={key}
                  type="button"
                  className={classNames.join(" ")}
                  onClick={() => selectDay(day)}
                  aria-pressed={key === selectedKey}
                  aria-current={key === todayKey ? "date" : undefined}
                  aria-label={`${formatDay(day)}, ${dayPosts.length} ${
                    dayPosts.length === 1 ? "post" : "posts"
                  }`}
                >
                  <span className="calendar-day-number">{day.getDate()}</span>

                  <span className="calendar-chips">
                    {dayPosts.slice(0, MAX_CHIPS).map((post) => (
                      <span
                        key={post.id}
                        className="calendar-chip"
                        title={`${post.platform} · ${formatTime(post)}\n${post.caption}`}
                      >
                        <span
                          className="platform-dot"
                          style={{ background: PLATFORM_COLORS[post.platform] }}
                        />

                        <span className="calendar-chip-text">
                          <strong>{formatTime(post)}</strong> {post.caption}
                        </span>
                      </span>
                    ))}

                    {hiddenCount > 0 && (
                      <span className="calendar-more">+{hiddenCount} more</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="calendar-legend">
            {Object.entries(PLATFORM_COLORS).map(([platform, color]) => (
              <span key={platform}>
                <span className="platform-dot" style={{ background: color }} />
                {platform}
              </span>
            ))}
          </div>
        </section>

        <aside className="day-panel">
          <h3>{formatDay(parseDateKey(selectedKey))}</h3>

          {selectedPosts.length > 0 ? (
            <ul>
              {selectedPosts.map((post) => {
                const status = getPostStatus(post);

                return (
                  <li key={post.id}>
                    <div className="day-panel-meta">
                      <span
                        className="platform-dot"
                        style={{ background: PLATFORM_COLORS[post.platform] }}
                      />
                      <strong>{post.platform}</strong>
                      <span>{formatTime(post)}</span>
                      <span className={`status ${status.toLowerCase()}`}>
                        {status}
                      </span>
                    </div>

                    <p>{post.caption}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="day-panel-empty">Nothing scheduled for this day.</p>
          )}

          {selectedKey >= todayKey && (
            <button onClick={() => onCreatePost(selectedKey)}>
              + Schedule a post
            </button>
          )}
        </aside>
      </div>
    </>
  );
}

export default Calendar;

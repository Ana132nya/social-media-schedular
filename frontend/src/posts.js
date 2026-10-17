export const PLATFORM_COLORS = {
  Instagram: "#db2777",
  Facebook: "#1877f2",
  LinkedIn: "#0891b2",
  "Twitter / X": "#111827",
};

export const PLATFORM_INFO = {
  Instagram: {
    name: "Instagram",
    handle: "@socialflow.studio",
    displayName: "SocialFlow Studio",
    charLimit: 2200,
    color: "#db2777",
    badgeBg: "linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)",
    role: "Brand Media",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    supportsFirstComment: true,
  },
  "Twitter / X": {
    name: "Twitter / X",
    handle: "@SocialFlowApp",
    displayName: "SocialFlow",
    charLimit: 280,
    color: "#111827",
    badgeBg: "#111827",
    role: "Official Tech",
    avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80",
    supportsFirstComment: false,
  },
  LinkedIn: {
    name: "LinkedIn",
    handle: "socialflow-technologies",
    displayName: "SocialFlow Technologies",
    charLimit: 3000,
    color: "#0891b2",
    badgeBg: "#0a66c2",
    role: "Software & Media · 14,280 followers",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    supportsFirstComment: true,
  },
  Facebook: {
    name: "Facebook",
    handle: "SocialFlowPage",
    displayName: "SocialFlow Global",
    charLimit: 63206,
    color: "#1877f2",
    badgeBg: "#1877f2",
    role: "Software Company · Public",
    avatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80",
    supportsFirstComment: false,
  },
};

export const DEFAULT_QUEUE_SLOTS = ["09:30", "13:15", "17:45", "20:00"];

export const STOCK_IMAGE_PRESETS = [
  {
    title: "Minimal Workspace",
    url: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1080&auto=format&fit=crop&q=80",
  },
  {
    title: "Creative Studio",
    url: "https://images.unsplash.com/photo-1542744094-3a31727560fa?w=1080&auto=format&fit=crop&q=80",
  },
  {
    title: "Modern Architecture",
    url: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1080&auto=format&fit=crop&q=80",
  },
  {
    title: "Abstract Gradient",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1080&auto=format&fit=crop&q=80",
  },
];

export const HASHTAG_PRESETS = [
  "#growth",
  "#socialmediamarketing",
  "#contentstrategy",
  "#branding",
  "#techtrends",
  "#productivity",
  "#creator",
];

export const HOOK_PRESETS = [
  {
    label: "🚀 Product Launch",
    text: "Excited to unveil what our team has been building behind the scenes! Here is why this changes everything: 👇",
  },
  {
    label: "💡 Actionable Tip",
    text: "Pro tip of the week: If you want to double your engagement, try focusing on one clear takeaway per post. Here is how:",
  },
  {
    label: "🎉 Milestone",
    text: "We just hit a massive milestone! A huge thank you to everyone in our community who made this journey possible. 🥂",
  },
  {
    label: "❓ Question",
    text: "Quick question for creators and marketers: What is the #1 tool in your workflow you could not live without right now?",
  },
];

export function getNextQueueSlot(existingPosts = []) {
  const now = new Date();
  const scheduledSet = new Set(
    existingPosts.map((p) => `${p.date}T${p.time}`)
  );

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const candidateDate = new Date();
    candidateDate.setDate(now.getDate() + dayOffset);
    const dateKey = toDateKey(candidateDate);

    for (const slot of DEFAULT_QUEUE_SLOTS) {
      const slotDateTime = new Date(`${dateKey}T${slot}`);
      if (slotDateTime > now && !scheduledSet.has(`${dateKey}T${slot}`)) {
        const isToday = dayOffset === 0;
        const isTomorrow = dayOffset === 1;
        const dayLabel = isToday
          ? "Today"
          : isTomorrow
          ? "Tomorrow"
          : candidateDate.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
        return {
          date: dateKey,
          time: slot,
          formatted: `${dayLabel} at ${slotDateTime.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`,
        };
      }
    }
  }

  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  return {
    date: toDateKey(tomorrow),
    time: "09:30",
    formatted: `Tomorrow at 9:30 AM`,
  };
}

export function getOptimalTimeSuggestions() {
  const now = new Date();
  const todayKey = toDateKey(now);
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowKey = toDateKey(tomorrow);
  const dayAfter = new Date();
  dayAfter.setDate(now.getDate() + 2);
  const dayAfterKey = toDateKey(dayAfter);

  const suggestions = [];

  const todayEvening = new Date(`${todayKey}T17:45`);
  if (todayEvening > now) {
    suggestions.push({
      date: todayKey,
      time: "17:45",
      label: "Today, 5:45 PM",
      score: "94% Audience Online",
      badge: "Peak Reach 🔥",
    });
  }

  suggestions.push({
    date: tomorrowKey,
    time: "09:15",
    label: "Tomorrow, 9:15 AM",
    score: "89% Audience Online",
    badge: "Morning Rush ⚡",
  });

  suggestions.push({
    date: tomorrowKey,
    time: "14:30",
    label: "Tomorrow, 2:30 PM",
    score: "85% Audience Online",
    badge: "Afternoon Wave 📈",
  });

  if (suggestions.length < 3) {
    suggestions.push({
      date: dayAfterKey,
      time: "11:00",
      label: "In 2 days, 11:00 AM",
      score: "82% Audience Online",
      badge: "High Engagement 🎯",
    });
  }

  return suggestions.slice(0, 3);
}

// "YYYY-MM-DD" in local time. toISOString() would use UTC and can land on
// the wrong day depending on the user's timezone.
export function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function getPostStatus(post) {
  if (post.status && post.status !== "Scheduled") return post.status;

  const timezoneOffsetMinutes = Number.isInteger(post.timezoneOffsetMinutes)
    ? post.timezoneOffsetMinutes
    : new Date(`${post.date}T${post.time}`).getTimezoneOffset();
  const publishAt = Date.parse(`${post.date}T${post.time}:00.000Z`)
    + timezoneOffsetMinutes * 60_000;

  return publishAt <= Date.now() ? "Due" : "Scheduled";
}

function daysFromToday(offset) {
  const date = new Date();
  date.setDate(date.getDate() + offset);

  return toDateKey(date);
}

// Placeholder data until there is a backend. Dates are relative to today so
// the calendar always has something to show.
export const samplePosts = [
  {
    id: "sample-1",
    platform: "Instagram",
    caption: "Behind the scenes of our autumn photoshoot 📸",
    date: daysFromToday(-12),
    time: "09:30",
  },
  {
    id: "sample-2",
    platform: "LinkedIn",
    caption: "We're hiring! Join our product team and help shape what's next.",
    date: daysFromToday(-5),
    time: "11:00",
  },
  {
    id: "sample-3",
    platform: "Facebook",
    caption: "Thank you for 10k followers! Here's a look back at our journey.",
    date: daysFromToday(-2),
    time: "17:00",
  },
  {
    id: "sample-4",
    platform: "Twitter / X",
    caption: "Product Launch: it's finally here 🚀",
    date: daysFromToday(0),
    time: "12:00",
  },
  {
    id: "sample-5",
    platform: "Instagram",
    caption: "Instagram Campaign: week 1 teaser",
    date: daysFromToday(1),
    time: "10:00",
  },
  {
    id: "sample-6",
    platform: "Facebook",
    caption: "Live Q&A with the founders this Friday. Drop your questions below!",
    date: daysFromToday(1),
    time: "14:00",
  },
  {
    id: "sample-7",
    platform: "LinkedIn",
    caption: "How we cut our release cycle in half: a short case study.",
    date: daysFromToday(1),
    time: "16:30",
  },
  {
    id: "sample-8",
    platform: "Twitter / X",
    caption: "Quick tip: you can now schedule posts straight from the calendar.",
    date: daysFromToday(1),
    time: "19:00",
  },
  {
    id: "sample-9",
    platform: "Instagram",
    caption: "Customer spotlight: meet the team at Northwind Coffee ☕",
    date: daysFromToday(4),
    time: "08:45",
  },
  {
    id: "sample-10",
    platform: "LinkedIn",
    caption: "Join our webinar on planning a quarter of social content.",
    date: daysFromToday(9),
    time: "15:00",
  },
  {
    id: "sample-11",
    platform: "Facebook",
    caption: "Weekend giveaway! Comment with your favourite feature to enter.",
    date: daysFromToday(15),
    time: "12:30",
  },
];

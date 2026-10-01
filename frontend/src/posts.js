export const PLATFORM_COLORS = {
  Instagram: "#db2777",
  Facebook: "#1877f2",
  LinkedIn: "#0891b2",
  "Twitter / X": "#111827",
};

// "YYYY-MM-DD" in local time. toISOString() would use UTC and can land on
// the wrong day depending on the user's timezone.
export function toDateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${date.getFullYear()}-${month}-${day}`;
}

export function getPostStatus(post) {
  const publishAt = new Date(`${post.date}T${post.time}`);

  return publishAt <= new Date() ? "Published" : "Scheduled";
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

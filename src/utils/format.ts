const relativeFormat = new Intl.RelativeTimeFormat("en-GB", {
  numeric: "auto",
});

const shortFormat = new Intl.DateTimeFormat("en-GB", { weekday: "long" });

const longFormat = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Format date with using relative, short, or long formats */
export const formatDate = (date: Date) => {
  let str;
  const now = new Date().setUTCHours(0, 0, 0, 0);
  const then = date.setUTCHours(0, 0, 0, 0);
  const days = (then - now) / 86400000;
  // Limit relative format to one week
  if (days > -6) {
    if (days > -2) {
      str = relativeFormat.format(days, "day");
    } else {
      str = shortFormat.format(date);
    }
    str = str.charAt(0).toUpperCase() + str.slice(1);
  } else {
    str = longFormat.format(date);
  }
  return str;
};

/** Format seconds to `00:00:00` duration */
export const formatTime = (seconds: string | number) => {
  seconds = Number.parseInt(String(seconds), 10);
  const hh = String(Math.floor(seconds / 3600)).padStart(2, "0");
  const mm = String(Math.floor(seconds / 60) % 60).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${hh}:${mm}:${ss}`.replace(/^00:/, "");
};

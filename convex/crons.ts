import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Daily job: expire trips whose endDate has passed.
// Runs at midnight UTC every day.
crons.daily(
  "expire trips",
  { hourUTC: 0, minuteUTC: 0 },
  internal.trips.expireTripsDaily,
);

// Poll at :00, :05, :10, … :55 every hour (clock-aligned 5-min intervals).
// Uses sitterSmsLog for dedup — safe to run repeatedly, no pre-scheduling needed.
crons.cron(
  "check sitter reminders",
  "*/5 * * * *",
  internal.sitterSmsQueries.checkAndSendReminders,
);

export default crons;

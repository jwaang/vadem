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

export default crons;

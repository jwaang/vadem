import { describe, it, expect } from "vitest";
import {
  formatTime12h,
  filterRelevantTasks,
  bucketTasks,
  buildReminderBody,
  type TimedTask,
} from "./smsReminderLogic";

// Helper to create tasks concisely
function task(
  specificTime: string,
  opts?: { end?: string; ref?: string },
): TimedTask {
  return {
    text: `Task at ${specificTime}`,
    specificTime,
    specificTimeEnd: opts?.end,
    taskRef: opts?.ref ?? `task-${specificTime}${opts?.end ? `-${opts.end}` : ""}`,
  };
}

// ─── formatTime12h ───

describe("formatTime12h", () => {
  it("formats morning time", () => {
    expect(formatTime12h("08:00")).toBe("8:00 AM");
  });

  it("formats afternoon time", () => {
    expect(formatTime12h("13:30")).toBe("1:30 PM");
  });

  it("formats midnight", () => {
    expect(formatTime12h("00:00")).toBe("12:00 AM");
  });

  it("formats noon", () => {
    expect(formatTime12h("12:00")).toBe("12:00 PM");
  });

  it("formats late night", () => {
    expect(formatTime12h("23:59")).toBe("11:59 PM");
  });
});

// ─── filterRelevantTasks ───

describe("filterRelevantTasks", () => {
  it("includes upcoming tasks", () => {
    const tasks = [task("20:00")];
    const result = filterRelevantTasks(tasks, new Set(), "19:50");
    expect(result).toHaveLength(1);
  });

  it("includes past incomplete point tasks", () => {
    const tasks = [task("08:00")];
    const result = filterRelevantTasks(tasks, new Set(), "19:50");
    expect(result).toHaveLength(1);
  });

  it("excludes past completed point tasks", () => {
    const t = task("08:00", { ref: "done-task" });
    const result = filterRelevantTasks([t], new Set(["done-task"]), "19:50");
    expect(result).toHaveLength(0);
  });

  it("includes past incomplete range tasks", () => {
    const t = task("15:00", { end: "19:00" });
    const result = filterRelevantTasks([t], new Set(), "19:50");
    expect(result).toHaveLength(1);
  });

  it("excludes past completed range tasks", () => {
    const t = task("15:00", { end: "19:00", ref: "done-range" });
    const result = filterRelevantTasks([t], new Set(["done-range"]), "19:50");
    expect(result).toHaveLength(0);
  });

  it("includes tasks at exactly reminderTime (upcoming)", () => {
    const tasks = [task("19:50")];
    const result = filterRelevantTasks(tasks, new Set(), "19:50");
    expect(result).toHaveLength(1);
  });
});

// ─── bucketTasks ───

describe("bucketTasks", () => {
  describe("overdue bucket (point-in-time, past, incomplete)", () => {
    it("single point task past due → 1 overdue", () => {
      const tasks = [task("08:00")];
      const { overdue } = bucketTasks(tasks, new Set(), "19:50");
      expect(overdue).toHaveLength(1);
    });

    it("multiple point tasks past due → correct count", () => {
      const tasks = [task("08:00"), task("14:00")];
      const { overdue } = bucketTasks(tasks, new Set(), "19:50");
      expect(overdue).toHaveLength(2);
    });

    it("completed point task → not overdue", () => {
      const t = task("08:00", { ref: "done" });
      const { overdue } = bucketTasks([t], new Set(["done"]), "19:50");
      expect(overdue).toHaveLength(0);
    });

    it("point task at exactly reminderTime → NOT overdue (< not <=)", () => {
      const tasks = [task("19:50")];
      const { overdue } = bucketTasks(tasks, new Set(), "19:50");
      expect(overdue).toHaveLength(0);
    });
  });

  describe("active/in-progress bucket (range tasks, started, incomplete)", () => {
    it("range task 15:00-19:00 at 19:50 → in progress", () => {
      const tasks = [task("15:00", { end: "19:00" })];
      const { active } = bucketTasks(tasks, new Set(), "19:50");
      expect(active).toHaveLength(1);
    });

    it("range task 15:00-19:00 at 15:00 → in progress (start <= reminderTime)", () => {
      const tasks = [task("15:00", { end: "19:00" })];
      const { active } = bucketTasks(tasks, new Set(), "15:00");
      expect(active).toHaveLength(1);
    });

    it("range task 15:00-19:00 at 14:59 → NOT active (upcoming)", () => {
      const tasks = [task("15:00", { end: "19:00" })];
      const { active, upcoming } = bucketTasks(tasks, new Set(), "14:59");
      expect(active).toHaveLength(0);
      expect(upcoming).toHaveLength(1);
    });

    it("completed range task → not active", () => {
      const t = task("15:00", { end: "19:00", ref: "done-range" });
      const { active } = bucketTasks([t], new Set(["done-range"]), "19:50");
      expect(active).toHaveLength(0);
    });

    it("range task started at exactly reminderTime → active", () => {
      const tasks = [task("19:50", { end: "21:00" })];
      const { active } = bucketTasks(tasks, new Set(), "19:50");
      expect(active).toHaveLength(1);
    });
  });

  describe("upcoming bucket", () => {
    it("task at 20:00, reminder at 19:50 → upcoming", () => {
      const tasks = [task("20:00")];
      const { upcoming } = bucketTasks(tasks, new Set(), "19:50");
      expect(upcoming).toHaveLength(1);
    });

    it("task at 19:50, reminder at 19:50 → NOT upcoming (equal = not >)", () => {
      const tasks = [task("19:50")];
      const { upcoming } = bucketTasks(tasks, new Set(), "19:50");
      expect(upcoming).toHaveLength(0);
    });
  });

  describe("mixed scenarios", () => {
    it("1 overdue + 1 active + 1 upcoming → correct counts", () => {
      const tasks = [
        task("08:00"),                        // overdue (point, past)
        task("15:00", { end: "19:00" }),       // active (range, started)
        task("20:00"),                        // upcoming
      ];
      const { overdue, active, upcoming } = bucketTasks(tasks, new Set(), "19:50");
      expect(overdue).toHaveLength(1);
      expect(active).toHaveLength(1);
      expect(upcoming).toHaveLength(1);
    });

    it("all tasks completed → all buckets empty", () => {
      const tasks = [
        task("08:00", { ref: "a" }),
        task("15:00", { end: "19:00", ref: "b" }),
        task("20:00", { ref: "c" }),
      ];
      const completed = new Set(["a", "b", "c"]);
      const { overdue, active, upcoming } = bucketTasks(tasks, completed, "19:50");
      expect(overdue).toHaveLength(0);
      expect(active).toHaveLength(0);
      // Upcoming completed tasks still show (filter happens in filterRelevantTasks)
      expect(upcoming).toHaveLength(1);
    });

    it("original bug scenario: 1 overdue point + 1 active range", () => {
      // reminder 19:50, tasks: 14:00 (point), 15:00-19:00 (range)
      const tasks = [
        task("14:00"),                        // overdue point
        task("15:00", { end: "19:00" }),       // active range (NOT overdue)
      ];
      const { overdue, active, upcoming } = bucketTasks(tasks, new Set(), "19:50");
      expect(overdue).toHaveLength(1);
      expect(active).toHaveLength(1);
      expect(upcoming).toHaveLength(0);
    });
  });
});

// ─── buildReminderBody ───

describe("buildReminderBody", () => {
  describe("single bucket messages", () => {
    it("1 overdue only", () => {
      const result = buildReminderBody([task("08:00")], [], [], 0);
      expect(result).toBe("Vadem: You have 1 overdue task.");
    });

    it("2 overdue only", () => {
      const result = buildReminderBody([task("08:00"), task("09:00")], [], [], 0);
      expect(result).toBe("Vadem: You have 2 overdue tasks.");
    });

    it("1 active only", () => {
      const result = buildReminderBody([], [task("15:00", { end: "19:00" })], [], 0);
      expect(result).toBe("Vadem: You have 1 task in progress.");
    });

    it("3 upcoming", () => {
      const result = buildReminderBody(
        [],
        [],
        [task("20:00"), task("21:00"), task("22:00")],
        0,
      );
      expect(result).toBe("Vadem: You have 3 upcoming tasks, next at 8:00 PM.");
    });
  });

  describe("multi-bucket messages", () => {
    it("overdue + active (two parts joined with 'and')", () => {
      const result = buildReminderBody(
        [task("08:00")],
        [task("15:00", { end: "19:00" })],
        [],
        0,
      );
      expect(result).toBe("Vadem: You have 1 overdue task and 1 task in progress.");
    });

    it("overdue + upcoming", () => {
      const result = buildReminderBody(
        [task("08:00")],
        [],
        [task("20:00"), task("21:00")],
        0,
      );
      expect(result).toBe(
        "Vadem: You have 1 overdue task and 2 upcoming tasks, next at 8:00 PM.",
      );
    });

    it("overdue + active + upcoming (oxford comma)", () => {
      const result = buildReminderBody(
        [task("08:00")],
        [task("15:00", { end: "19:00" })],
        [task("20:00")],
        0,
      );
      expect(result).toBe(
        "Vadem: You have 1 overdue task, 1 task in progress, and 1 upcoming task, next at 8:00 PM.",
      );
    });
  });

  describe("anytime suffix", () => {
    it("timed buckets + 1 anytime", () => {
      const result = buildReminderBody([task("08:00")], [], [], 1);
      expect(result).toBe(
        "Vadem: You have 1 overdue task. You also have 1 other task to complete.",
      );
    });

    it("timed buckets + 3 anytime", () => {
      const result = buildReminderBody([task("08:00")], [], [], 3);
      expect(result).toBe(
        "Vadem: You have 1 overdue task. You also have 3 other tasks to complete.",
      );
    });

    it("no timed buckets + 2 anytime → fallback message", () => {
      const result = buildReminderBody([], [], [], 2);
      expect(result).toBe("Vadem: You still have 2 tasks to complete today.");
    });

    it("no timed buckets + 1 anytime → singular", () => {
      const result = buildReminderBody([], [], [], 1);
      expect(result).toBe("Vadem: You still have 1 task to complete today.");
    });
  });

  describe("no tasks at all", () => {
    it("0 timed + 0 anytime → null", () => {
      const result = buildReminderBody([], [], [], 0);
      expect(result).toBeNull();
    });
  });
});

// ─── Integration-style scenario tests ───

describe("end-to-end scenarios", () => {
  it("original bug scenario: 1 overdue + 1 active + 1 anytime", () => {
    const allTasks = [
      task("08:00"),                        // point, past
      task("14:00"),                        // point, past
      task("15:00", { end: "19:00" }),       // range, started
    ];
    const completedRefs = new Set(["task-08:00"]); // 08:00 completed
    const reminderTime = "19:50";

    const relevant = filterRelevantTasks(allTasks, completedRefs, reminderTime);
    const { overdue, active, upcoming } = bucketTasks(relevant, completedRefs, reminderTime);
    const body = buildReminderBody(overdue, active, upcoming, 1);

    expect(overdue).toHaveLength(1);  // 14:00
    expect(active).toHaveLength(1);   // 15:00-19:00
    expect(upcoming).toHaveLength(0);
    expect(body).toBe(
      "Vadem: You have 1 overdue task and 1 task in progress. You also have 1 other task to complete.",
    );
  });

  it("all completed → no relevant tasks", () => {
    const allTasks = [
      task("08:00", { ref: "a" }),
      task("14:00", { ref: "b" }),
      task("15:00", { end: "19:00", ref: "c" }),
    ];
    const completedRefs = new Set(["a", "b", "c"]);
    const relevant = filterRelevantTasks(allTasks, completedRefs, "19:50");
    expect(relevant).toHaveLength(0);
  });

  it("morning reminder: all tasks upcoming", () => {
    const allTasks = [task("08:00"), task("09:00"), task("14:00")];
    const reminderTime = "07:00";

    const relevant = filterRelevantTasks(allTasks, new Set(), reminderTime);
    const { overdue, active, upcoming } = bucketTasks(relevant, new Set(), reminderTime);
    const body = buildReminderBody(overdue, active, upcoming, 0);

    expect(overdue).toHaveLength(0);
    expect(active).toHaveLength(0);
    expect(upcoming).toHaveLength(3);
    expect(body).toBe("Vadem: You have 3 upcoming tasks, next at 8:00 AM.");
  });

  it("end of day: all point tasks overdue", () => {
    const allTasks = [task("08:00"), task("14:00"), task("18:00")];
    const reminderTime = "22:00";

    const relevant = filterRelevantTasks(allTasks, new Set(), reminderTime);
    const { overdue, active, upcoming } = bucketTasks(relevant, new Set(), reminderTime);
    const body = buildReminderBody(overdue, active, upcoming, 0);

    expect(overdue).toHaveLength(3);
    expect(body).toBe("Vadem: You have 3 overdue tasks.");
  });

  it("mixed completions: 3 overdue tasks but 2 completed → 1 overdue", () => {
    const allTasks = [
      task("08:00", { ref: "a" }),
      task("10:00", { ref: "b" }),
      task("14:00", { ref: "c" }),
    ];
    const completedRefs = new Set(["a", "b"]);
    const reminderTime = "19:50";

    const relevant = filterRelevantTasks(allTasks, completedRefs, reminderTime);
    const { overdue } = bucketTasks(relevant, completedRefs, reminderTime);
    const body = buildReminderBody(overdue, [], [], 0);

    expect(relevant).toHaveLength(1);
    expect(overdue).toHaveLength(1);
    expect(body).toBe("Vadem: You have 1 overdue task.");
  });
});

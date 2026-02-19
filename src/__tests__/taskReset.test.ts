/**
 * Unit tests for US-047: Daily task reset logic.
 *
 * Tests the pure filtering functions that drive implicit daily reset:
 *   - Completions are scoped to a date field; new day = no completions returned
 *   - Overlay items with a past date disappear from Today View
 *   - Today's completions are correctly returned
 *
 * These functions mirror the logic in convex/todayView.ts and
 * src/app/t/[tripId]/TodayPageInner.tsx.
 */

const TODAY = "2026-02-19";
const YESTERDAY = "2026-02-18";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

// ── filterCompletionsByDate ────────────────────────────────────────────

function filterCompletionsByDate(
  completions: Array<{ _id: string; taskRef: string; date: string }>,
  today: string,
) {
  return completions.filter((c) => c.date === today);
}

// Test: completion from yesterday does not appear in today's task list
{
  const completions = [
    { _id: "c1", taskRef: `recurring:abc:${YESTERDAY}`, date: YESTERDAY },
    { _id: "c2", taskRef: `recurring:abc:${TODAY}`, date: TODAY },
    { _id: "c3", taskRef: `overlay:xyz`, date: YESTERDAY },
  ];
  const result = filterCompletionsByDate(completions, TODAY);
  assert(result.length === 1, "only today completion returned");
  assert(result[0]._id === "c2", "correct completion returned");
  assert(
    !result.some((c) => c.date === YESTERDAY),
    "yesterday completions excluded",
  );
}

// Test: today's completions are returned
{
  const completions = [
    { _id: "c1", taskRef: `recurring:abc:${TODAY}`, date: TODAY },
    { _id: "c2", taskRef: `overlay:xyz`, date: TODAY },
  ];
  const result = filterCompletionsByDate(completions, TODAY);
  assert(result.length === 2, "both today completions returned");
}

// Test: empty result when no completions exist for today (new day = implicit reset)
{
  const completions = [
    { _id: "c1", taskRef: `recurring:abc:${YESTERDAY}`, date: YESTERDAY },
    { _id: "c2", taskRef: `overlay:xyz`, date: YESTERDAY },
  ];
  const result = filterCompletionsByDate(completions, TODAY);
  assert(result.length === 0, "new day yields zero completions (implicit reset)");
}

// ── filterOverlayItemsByDate ───────────────────────────────────────────

function filterOverlayItemsByDate(
  items: Array<{ _id: string; date?: string; text: string }>,
  today: string,
) {
  return items.filter((item) => item.date === today || item.date === undefined);
}

// Test: overlay item dated yesterday does not appear in Today View
{
  const overlayItems = [
    { _id: "o1", date: YESTERDAY, text: "Yesterday one-time task" },
    { _id: "o2", date: TODAY, text: "Today one-time task" },
    { _id: "o3", date: undefined, text: "Everyday recurring task" },
  ];
  const result = filterOverlayItemsByDate(overlayItems, TODAY);
  assert(result.length === 2, "only today + undated items shown");
  assert(
    !result.some((i) => i._id === "o1"),
    "yesterday overlay item excluded",
  );
  assert(
    result.some((i) => i._id === "o2"),
    "today overlay item included",
  );
  assert(
    result.some((i) => i._id === "o3"),
    "undated (everyday) item included",
  );
}

// Test: overlay item dated tomorrow does not appear today
{
  const TOMORROW = "2026-02-20";
  const overlayItems = [
    { _id: "o1", date: TOMORROW, text: "Tomorrow task" },
    { _id: "o2", date: TODAY, text: "Today task" },
  ];
  const result = filterOverlayItemsByDate(overlayItems, TODAY);
  assert(result.length === 1, "only today item shown");
  assert(result[0]._id === "o2", "correct item returned");
}

// ── Verify taskRef date-scoping for recurring tasks ────────────────────

// The taskRef for recurring tasks encodes the date: `recurring:{id}:{date}`
// This means a new calendar day automatically generates a new taskRef,
// so even if we didn't filter by date, yesterday's completions wouldn't match.
{
  const instructionId = "abc123";
  const yesterdayTaskRef = `recurring:${instructionId}:${YESTERDAY}`;
  const todayTaskRef = `recurring:${instructionId}:${TODAY}`;

  // Simulate the completion map from today's completions
  const todayCompletions = [{ _id: "c1", taskRef: todayTaskRef, date: TODAY }];
  const completionMap = new Map(todayCompletions.map((c) => [c.taskRef, c._id]));

  assert(
    completionMap.has(todayTaskRef),
    "today taskRef found in completion map",
  );
  assert(
    !completionMap.has(yesterdayTaskRef),
    "yesterday taskRef not in completion map (implicit reset)",
  );
}

// All assertions passed
export {};

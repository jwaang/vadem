# Vadem User Stories

## 1. Preview sitter view without creating a trip

**As a creator**, I want to preview what my sitter will see without having to create a trip, so that I can verify my manual, tasks, and property details look correct from the sitter's perspective before sharing.

**Acceptance criteria:**
- A "Preview sitter view" action is accessible from the property/dashboard screen
- Preview renders the sitter today view layout using the property's current manual sections, instructions, and pet profiles
- Preview uses a simulated "today" with sample task states (nothing checked off)
- No trip, share link, or session is created — this is a read-only, creator-only view
- Preview is clearly labeled so the creator knows it's not a live sitter link

---

## 2. Share sitter link before trip starts

**As a creator**, I want to share the sitter link before the trip start date, so that my sitter can review the manual, familiarize themselves with the property, and understand their schedule in advance.

**Acceptance criteria:**
- Share link can be generated and sent while the trip is in `draft` or `active` status, regardless of start date
- Sitters accessing the link before the start date see a pre-trip preview: property name, pet profiles, manual sections (read-only), and the trip date range
- Task completion and vault access remain locked until the trip start date
- The existing `NOT_STARTED` state is enhanced from the current minimal preview (property name + pet names only) to include the full manual

---

## 3. Delete a trip

**As a creator**, I want to delete an existing trip, so that I can remove trips that were created by mistake or are no longer needed.

**Acceptance criteria:**
- Delete action is available on trips in any status (`draft`, `active`, `completed`, `expired`)
- Deleting a trip removes associated overlay items, task completions, activity log entries, and invalidates any active sitter sessions
- Share link and report link are revoked on deletion
- Creator is shown a confirmation dialog before deletion with a warning about permanent data loss
- If the deleted trip was the only active/draft trip, the property returns to a "no active trip" state

---

## 4. Modify trip dates

**As a creator**, I want to edit the start and/or end dates of an existing trip, so that I can adjust plans without having to delete and recreate the trip.

**Acceptance criteria:**
- Date editing is available for trips in `draft` or `active` status
- Changing the end date updates `linkExpiry` accordingly and reschedules the "trip ending soon" notification
- If the start date is moved to the future on an `active` trip, sitter task access is suspended until the new start date
- Changing dates does not delete existing task completions or activity log entries
- Date-specific overlay items that fall outside the new date range are flagged or surfaced to the creator for review

---

## 5. Fix activity feed proof filter

**Bug**: When selecting the "Proof" filter chip on the activity timeline, proof items are not shown in the filtered view. However, proof items do appear correctly in the "All" tab. Double check Task and Vault filter chips as well, not just Proof.

**Acceptance criteria:**
- Selecting the "Proof" filter chip shows only `proof_uploaded` events
- The filter passes `eventType: "proof_uploaded"` to `getActivityForTrip`
- Verify all filter chips work correctly: All (no filter), Tasks (`task_completed`), Proof (`proof_uploaded`), Vault (`vault_accessed`)

---

## 6. Time range on tasks

**As a creator**, I want to set a time range (e.g. 9:00 AM - 11:00 AM) on a task instead of only a single specific time, so that I can communicate flexible windows for when a task should be completed.

**Acceptance criteria:**
- Instructions and overlay items support an optional `specificTimeEnd` field (HH:mm) in addition to the existing `specificTime` (start)
- When both start and end times are set, the sitter view displays the range (e.g. "9:00 AM - 11:00 AM")
- `timeSlot` derivation uses the start time for bucketing (morning/afternoon/evening)
- Setting only a start time (no end) continues to work as it does today
- The time picker UI allows selecting a start time and optionally an end time, with validation that end > start

---

## 7. Section visibility: tasks vs. manual-only

**As a creator**, I want to specify whether a section appears in the sitter's task view, the sitter's manual only, or both, so that informational sections like "Where Things Are" don't clutter the daily task list. I also want to clean up the prebuilt sections, theres too many unnecessary sections.

**Acceptance criteria:**
- Sections have a `visibility` field: `tasks` | `manual` | `both` (default: `both` for backward compatibility)
- When creating or editing a section, the creator can choose the visibility mode
- Sections set to `manual` do not appear in the sitter's today/task view — their instructions are excluded from `getTodayTasks`
- Sections set to `tasks` appear in the task view but not in the read-only manual browse
- Prebuilt informational sections (e.g. "Where Things Are") default to `manual`
- Prebuilt routine sections (e.g. "Morning Routine") default to `tasks` or `both`
- We should just have Morning Routine, Evening Routine, Afternoon Routine, and Where Things Are.

**Note:** This story is closely related to story 9 (time block property on sections). Both add metadata to sections and should be designed together. The `visibility` field and `timeBlock` field are complementary — a section with `visibility: manual` would have `timeBlock: null`.

---

## 8. Show section name in activity timeline

**As a creator**, I want the activity timeline to include the section name when displaying task-related events, so that I can quickly understand which part of the routine a completed task belongs to.

**Acceptance criteria:**
- `task_completed` and `task_unchecked` activity log entries include the section title (e.g. "completed 'Feed the cat' in Evening Routine")
- The section name is stored on the activity log entry at write time (denormalized) so it remains accurate even if the section is later renamed
- Existing activity entries without section info continue to display as they do today (no migration required)
- The section name is displayed in a visually secondary style (muted text or parenthetical) so the task title remains the primary focus

---

## 9. Add time block property to sections

**As a creator**, I want to associate a section with a time block (morning, afternoon, evening, anytime) so that tasks within it appear in the correct time grouping on the sitter view — regardless of what the section is named.

**Acceptance criteria:**
- Sections have a `timeBlock` field: `morning` | `afternoon` | `evening` | `anytime` | `null`
- Prebuilt time-based sections come with a default `timeBlock` pre-set
- Info-only sections (e.g. "Where Things Are") have `timeBlock: null` and don't appear in the task view
- Custom sections show a time block picker (chips: Morning · Afternoon · Evening · Anytime) at creation/edit
- Sitter task view groups tasks by their section's `timeBlock`, not by explicit task time or section name
- Tasks with explicit times still pin to their exact slot within the relevant block
- Renaming a section does not change its time block association

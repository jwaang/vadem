# QA Findings — Vadem App
**Date:** 2026-02-21
**Tested:** Desktop (1440px) + Mobile (390px)
**Account:** jonathan.wang1996@gmail.com

---

## 🔴 Critical — Broken Features

### 1. `/dashboard/property` is a 404
The "Edit property →" link on the dashboard property card navigates to `/dashboard/property`, which has no page. This is a primary call-to-action that dead-ends every user who clicks it.
**Fix:** Create a redirect from `/dashboard/property` → `/dashboard/property/pets`.

### 2. Login form renders blank while JS loads
`LoginFormWrapper` uses `dynamic(..., { ssr: false, loading: () => null })`. While the client-side bundle loads, the card shows only "Forgot password?" with no visible form inputs. Visually jarring and looks broken to users on slower connections.
**Fix:** Replace `loading: () => null` with a skeleton of two input-shaped divs.

---

## 🟠 High — Significant UX Bugs

### 3. Trips page shows "No trips yet" even when a trip is active
`/dashboard/trips` renders the empty state before Convex data resolves, so users with active trips see "No trips yet" on initial load. The trip appears after a re-render.
**Fix:** Show a loading skeleton while trips query is `undefined`, not the empty state.

### 4. Trip dates shown in raw ISO format
The trip detail and trips list display dates as "2026-02-21 → 2026-02-22" instead of human-readable "Feb 21 – Feb 22, 2026".
**Fix:** Format dates with `toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })`.

### 5. "< My Property" breadcrumb in editors links to 404
Contacts and Vault editors have a "< My Property" breadcrumb pointing to `/dashboard/property` (the 404 above). Pets editor correctly uses "< Dashboard".
**Fix:** Change breadcrumb in Contacts and Vault editors to "< Dashboard" pointing to `/dashboard`.

---

## 🟡 Medium — Data Display Issues

### 6. Pet feeding empty state shows "nothing"
When a pet has no feeding instructions set, the pets list (both wizard and dashboard editor) displays the word "nothing" instead of a neutral placeholder. Same for "na" on empty vet field.
**Fix:** Replace falsy/empty values with `"—"` in the pet card summary row.

### 7. Wizard Step 1 photo upload says "Tap to upload" on desktop
The upload dropzone in wizard step 1 says "Tap to upload a photo" — "tap" is mobile-specific language, wrong on desktop.
**Fix:** Change to "Upload a photo" (works on both platforms).

### 8. Wizard nav step label says "Instruction" (singular)
The stepper nav shows step 5 as "Instruction" instead of "Instructions".
**Fix:** Update label to "Instructions".

---

## 🔵 Low — Framing & Copy (Product Strategy)

The user persona is the **anxious trip-leaver** who primarily worries about their pets. The features are right, but several copy strings frame the app as a generic home guidebook rather than a pet care manual.

### 9. Home page tagline under-sells pets
Current: `"The care manual for your home."`
Better: `"The care manual for your pets and home."`
Pets are the emotional hook that differentiates Vadem from Touch Stay/Airbnb guides.

### 10. Dashboard subtitle is home-generic
Current: `"Here's your home at a glance"`
Better: `"Here's your pets and home at a glance"`

### 11. Wizard step 5 heading says "House instructions"
Current: `"House instructions"` / subtitle chooses "which areas to document"
Better: `"Home instructions"` / subtitle: `"Your sitter can browse each section in the care manual."`
("Home" > "House" — warmer, less landlord-ish)

### 12. Sections editor page title says "House sections"
Current: `"House sections"`
Better: `"Home sections"`

### 13. Trips "How it works" step 3 misses pet framing
Current: `"They get a personalized care manual"`
Better: `"They get a care manual for your pets and home"`

### 14. Wizard step 1 subtitle is functional, not emotional
Current: `"Give your property a name so sitters know what they're caring for."`
Better: `"Name your home — it appears at the top of your sitter's care manual."`

---

## Design Consistency Notes

- **Contacts editor breadcrumb** says "My Property" while pets says "Dashboard" — inconsistent.
- **Trip detail page** uses full ISO breadcrumb path "← Dashboard | Activity Feed" — the pipe separator looks odd; a chevron or slash would be cleaner.
- **"Reset link" in trips** has no confirmation — a single click resets the sitter's access link. Should show an inline confirm.
- **Pet age display** — age shown as bare number ("7", "5") without unit. Should be "7 yrs" or "7 y/o" for clarity.

---

## Summary Fix Priority

| # | Issue | Effort | Impact |
|---|-------|--------|--------|
| 1 | `/dashboard/property` 404 | XS (redirect) | Critical |
| 2 | Login form blank flash | S (skeleton) | High |
| 3 | Trips empty state on load | S (loading guard) | High |
| 4 | Raw ISO trip dates | XS (date format) | High |
| 5 | Breadcrumbs linking to 404 | XS | High |
| 6 | Pet "nothing"/"na" empty states | XS | Medium |
| 7 | "Tap to upload" on desktop | XS | Low |
| 8 | "Instruction" singular label | XS | Low |
| 9–14 | Copy/framing updates | S | Medium (strategic) |

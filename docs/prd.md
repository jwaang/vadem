# Vadem — Product Requirements Document

**Version**: 1.0
**Last Updated**: 2026-02-17
**Status**: Draft

---

## 1. Product Overview

**Vadem** is a web-based app that lets homeowners create structured, media-rich, searchable care manuals for anyone temporarily looking after their home and pets — then share them via a single link. The recipient (sitter) gets a contextual "today view" with time-slotted tasks, location cards showing exactly where things are, optional photo proof of task completion, and secure access to sensitive credentials — all without downloading an app or creating an account.

### Vision

Replace the chaotic vadem experience (text threads, Google Docs, sticky notes, forgotten PDFs) with a single, living document that answers every question before the sitter asks it.

### Target Persona

**The anxious trip-leaver**: a pet-owning homeowner who travels 2-6 times per year and leaves pets/house with a friend, family member, or hired sitter. Experiences recurring failures with "where is the dog food?", buried text messages, and no way to know if tasks were actually completed.

### Why Now

- The consumer pet/house-sitter instruction space is almost completely unserved. CareSheet (launched ~early 2026) is the only dedicated entrant.
- 90%+ of instruction-sharing still happens via text messages and Google Docs.
- STR guidebooks ($7-$10/mo) and ops tools (Breezeway, Turno) validate the mechanics but serve commercial users only.
- PetPort validates that consumers will adopt link-based instruction sharing for caretakers.

---

## 2. Platform & Tech Stack

| Decision | Choice |
|---|---|
| Platform | **PWA (web-first)** — no app store required, shareable links work natively, offline via service worker |
| Frontend | **Next.js** |
| Styling | **Tailwind CSS v4** via `@tailwindcss/postcss` — utility-first, design tokens as CSS custom properties in `globals.css` |
| Backend / DB / Real-time | **Convex.dev** |
| Storage | Cloud storage for photos/videos (S3-compatible or Convex file storage) |
| Auth (creator) | Email/password or OAuth (Google, Apple) |
| Auth (sitter) | No account required — link-based access. Phone PIN verification for vault only. |
| Notifications | Push notifications (web push API) + in-app activity feed |
| Offline | Service worker caching — sitter can access instructions after first load |
| Design System | **[vadem-design-system.md](./vadem-design-system.md)** — Warm Editorial aesthetic with full token spec, component library, and motion guidelines |

### Design System

All UI implementation must follow the Vadem Design System defined in **[vadem-design-system.md](./vadem-design-system.md)**. Key decisions:

- **Aesthetic**: Warm Editorial — "the warmth of a handwritten care note meets the precision of a beautifully designed cookbook"
- **Fonts**: Instrument Serif (display/headings), Bricolage Grotesque (body/UI), Caveat (handwritten captions on location cards)
- **Colors**: Terracotta `#C2704A` (primary), Sage `#5E8B6A` (success/completed), Amber `#D4943A` (trip overlay), Slate `#3D4F5F` (vault/security), Linen `#FAF6F1` (background)
- **Signature Element**: Location Cards — polaroid-style photo cards with Caveat-font captions, slight tilt, warm shadow
- **Motion**: Spring easing for checkboxes/toggles, ease-out for cards/transitions, staggered fade-up for task lists
- **Shadows**: Warm-tinted using `rgba(42,31,26)` — never neutral gray

The design system includes full specs for: buttons, inputs, badges, location cards, pet profile cards, task items, vault items, emergency contact bar, today view header, wizard progress, section navigation, notification toasts, activity feed, and bottom navigation.

### Team & Timeline

- **Team**: 2-3 people
- **Target**: 8-12 weeks to v1 launch
- **Pricing at launch**: Completely free — validate adoption and engagement before monetizing

---

## 3. User Roles & Authentication Model

### Creator (Homeowner / Pet Owner)

- Full account required (email/password or OAuth)
- Creates and manages the property manual, pet profiles, trip overlays, and vault
- Controls who can access the vault (by name + phone number)
- Receives push notifications and views activity feed
- Generates/revokes shareable links

### Sitter (Recipient)

**Progressive identity model — no account required.**

| Access Level | What They Can Do | Auth Required |
|---|---|---|
| **Anonymous (link only)** | View all instructions, location cards, today view, pet profiles, tap-to-call contacts. Check off tasks. | None — just the link |
| **Phone-verified** | All of the above + view vault items (alarm codes, WiFi, lockbox). Upload proof photos with name attribution. | One-time SMS PIN to the phone number the owner registered |
| **Optional full user** | All of the above + create their own Vadems (conversion to creator) | Email signup (prompted naturally, never gated) |

### Vault Access Rules

- Owner adds sitter by **name + phone number** when setting up the trip
- Only registered phone numbers can receive the vault PIN
- Vault items are **fully hidden** (not blurred/teased) to unregistered viewers — they see: "Sarah shared secure info with you — verify your phone number to view"
- Vault access is **logged with timestamp** — owner is notified: "Sarah accessed your alarm code at 2:34 PM"
- Vault auto-expires when the trip end date passes
- Owner can **one-click revoke** vault access at any time
- If link is forwarded, the new person can see instructions but **cannot access the vault**

### Task Check-Off Attribution

- No identity required to check off tasks
- If photo proof is enabled by the owner, sitter enters their name (pre-filled if owner added them) before uploading
- Owner sees: "Sarah marked 'morning feeding' complete at 7:12 AM [photo attached]"

---

## 4. Core Features (v1)

### 4.1 Property Manual (Baseline)

The permanent, reusable manual for the home. Created once, updated as needed, reused across trips.

**Guided wizard authoring flow:**
1. Add your home (name, address, photo)
2. Add your pets (rich profiles — see 4.2)
3. Add access info (vault items — see 4.5)
4. Add emergency contacts (tap-to-call — see 4.7)
5. Add house instructions by section
6. Add location cards (see 4.3)
7. Review and publish

**Structured sections** (pre-built in wizard, all optional):
- Pets (linked to pet profiles)
- Access & Arrival (keys, parking, entry)
- Emergencies (contacts, nearest hospital, fire extinguisher location)
- Appliances (thermostat, washer/dryer, dishwasher, TV/streaming)
- Kitchen (pantry, dishes, trash, recycling)
- Trash & Mail (schedule, bins, mailbox)
- Plants & Garden (watering schedule, locations)
- "Where Things Are" (general location cards for anything else)
- House Rules (quiet hours, neighbors, shoes off, etc.)
- Departure / Lockup (checkout checklist)

**Search**: Sitter-side full-text search across all instructions. Sitter can search "dog food" and jump directly to the relevant instruction + location card.

### 4.2 Pet Profiles

The emotional core of the product. Rich, structured profiles for each pet.

**Required fields:**
- Photo (primary)
- Name
- Species / breed
- Age
- Feeding instructions (what, how much, when, where food is stored)
- Vet name + phone (tap-to-call)

**Optional fields:**
- Additional photos / video
- Personality notes ("Luna is shy with strangers for the first hour")
- Medical conditions
- Medications with schedule (name, dosage, frequency, time, location of meds)
- Behavioral quirks ("will try to escape through the garage door")
- Allergies / dietary restrictions
- Microchip number
- Insurance info
- Walking routine (duration, route notes, leash location)
- Grooming needs
- Comfort items ("sleeps with the blue blanket in the hall closet")

Each field can have an attached **location card** (photo/video of where the item is).

### 4.3 Location Cards

Per-instruction media attachments that solve the "where is it?" problem. The core UX differentiator.

**Structure:**
- Attached to any instruction or pet profile field
- Photo and/or short video (30-second max for v1)
- Short text caption ("bottom shelf, pantry, behind the cereal")
- Room/area tag (Kitchen, Garage, Laundry, Master Bedroom, Backyard, etc.)

**Examples:**
- "Luna's arthritis pills" → photo of the pill bottle on the kitchen counter next to the toaster
- "Circuit breaker" → video walking from the hallway to the basement panel
- "Spare key" → photo of the fake rock by the side gate

**Sitter experience**: Location cards render inline with the instruction. Tappable to expand to full-screen photo/video.

### 4.4 Trip Overlay + Today View

The time-bound "what's different this week" layer. The architectural differentiator.

#### Trip Overlay

- Created on top of the permanent manual for a specific trip
- Has explicit **start date** and **end date**
- Contains trip-specific information that doesn't belong in the permanent manual:
  - Unusual feeding schedule ("Luna gets an extra scoop this week — vet's orders")
  - Medication changes
  - Scheduled visitors ("plumber coming Tuesday 2-4 PM")
  - Temporary house changes ("thermostat set to 68, don't change")
  - One-time tasks ("bring in the Amazon package expected Wednesday")
  - Owner travel details ("reachable by text, 3 hours ahead")
- **Auto-expires** on the end date — overlay content disappears, manual reverts to baseline
- Overlay items render with a visual indicator (e.g., badge or highlight) so the sitter knows "this is specific to this trip"
- Multiple overlays cannot be active simultaneously (one trip at a time for v1)

#### Today View (Sitter's Default Screen)

The sitter's landing page after opening the link. Shows **only what's relevant right now**.

**Layout:**
- **Header**: Trip dates, owner name, quick-access to emergency contacts + vault
- **Time-slotted task list** for today:
  - Morning tasks (feeding, medications, let dog out)
  - Afternoon tasks (walk, water plants)
  - Evening tasks (feeding, lockup routine)
  - Any-time tasks (check mail, bring in packages)
- Each task shows:
  - Instruction text
  - Attached location card (if any)
  - Check-off button
  - Photo proof upload button (if owner enabled it)
  - Trip overlay badge (if this task is trip-specific)
- **"Full Manual" tab/link**: access the complete property manual, searchable
- **Tomorrow preview**: collapsed section showing what's coming next

**Task generation logic:**
- Recurring tasks from the permanent manual (e.g., "feed Luna breakfast — 7 AM daily") populate every day
- One-time tasks from the trip overlay populate on their specific date
- Tasks reset daily (a new day = fresh task list)

### 4.5 Secure Credential Vault

Encrypted storage for sensitive information, separated from general instructions.

**Vault item types:**
- Door code / lockbox combination
- Alarm code + disarm instructions
- WiFi network name + password
- Gate code
- Garage code
- Safe combination
- Any custom secret (free-text label + value)

**Each vault item includes:**
- The credential value (encrypted at rest)
- Short instruction text ("enter code on keypad by front door, press # to confirm")
- Optional location card (photo of the keypad/lock/router)

**Access model** (see Section 3 for full auth details):
- Visible only to phone-verified sitters registered by the owner
- Auto-expires when trip end date passes
- Owner notified on each access with timestamp
- One-click revoke by owner
- Fully hidden (not blurred) to unverified viewers

### 4.6 Task Check-Off + Photo Proof

Lightweight accountability borrowed from STR ops tools, adapted for consumer use.

**Owner controls (per task):**
- Check-off enabled (default: yes for all tasks)
- Photo proof required (default: no — owner opts in per task)
- Recommended: 1-3 proof-required tasks per day max to avoid "cleaner-grade" burden

**Sitter experience:**
- Tap to mark task complete → timestamp logged
- If proof required → camera opens, sitter takes/uploads photo, enters name (pre-filled if registered) → photo + timestamp + name logged
- Completed tasks show a checkmark but remain visible (not hidden)

**Owner experience:**
- Activity feed shows all task completions with timestamps
- Proof photos viewable in the feed and in the trip report
- Push notification for each completion (configurable: all tasks, proof-only tasks, or batch digest)

### 4.7 Emergency Contacts (Tap-to-Call)

Persistent quick-access bar or section for critical contacts.

**Default contact slots:**
- Owner (primary phone)
- Owner (secondary / partner)
- Veterinarian (per pet if different)
- Emergency neighbor / local contact
- Poison control (pre-filled: ASPCA 888-426-4435)
- Non-emergency local police

Each contact: name, relationship/role, phone number (tap-to-call), optional notes.

Accessible from every screen — always one tap away from the today view.

### 4.8 Shareable Link + Trip Activation

**Link generation:**
- Owner generates a unique link per trip (or reuses the manual link with trip overlay activated)
- Optional: password protection on the link (separate from vault PIN)
- Optional: link expiration date (auto-set to trip end date)
- Link can be shared via text, email, WhatsApp, or any messaging app
- Owner can **reset/regenerate** the link to revoke access to all previous recipients

**Trip activation flow:**
1. Owner has a completed property manual
2. Owner taps "New Trip"
3. Sets start/end dates
4. Adds trip-specific overlay items (or skips)
5. Adds sitter(s) by name + phone number (for vault access)
6. Sets photo proof preferences per task
7. Generates and shares the link
8. Trip auto-activates on start date, auto-expires on end date

### 4.9 Trip Report (Exportable)

Post-trip summary available to the owner after the trip ends.

**Contents:**
- Trip dates and sitter name(s)
- All tasks with completion status (done / not done / skipped)
- Timestamps for each completion
- Proof photos (inline)
- Vault access log (who accessed what, when)
- Any notes/issues flagged by the sitter (stretch: simple "report an issue" button for sitter)

**Format for v1:**
- Scrollable in-app recap page
- Downloadable as PDF
- Shareable link to the report (for sending to co-owners, insurance, etc.)

### 4.10 Owner Notifications + Activity Feed

**Push notifications (web push) for:**
- Sitter opened the Vadem link for the first time
- Sitter accessed a vault item (with timestamp)
- Sitter completed a task (configurable: all / proof-only / digest)
- Sitter uploaded a proof photo
- Trip overlay is about to expire (24 hours before end date)

**In-app activity feed:**
- Chronological log of all sitter interactions
- Filterable by event type
- Persists after trip ends (feeds into the trip report)

### 4.11 Offline Access

- PWA with service worker caching
- After first load, sitter can access all instructions, location cards (cached photos), today view, and pet profiles offline
- Task check-offs queue locally and sync when back online
- Vault items require online verification (PIN via SMS) — cannot be cached offline
- Photo proof uploads queue locally and sync when connectivity returns

---

## 5. Information Architecture

```
Vadem (app)
├── Creator Dashboard
│   ├── My Property
│   │   ├── Property Details (name, address, photo)
│   │   ├── Pet Profiles[]
│   │   │   ├── Profile fields + location cards
│   │   │   └── Medications + schedules
│   │   ├── Manual Sections[]
│   │   │   ├── Instructions[]
│   │   │   │   └── Location Cards[]
│   │   │   └── Section metadata (icon, order)
│   │   ├── Vault Items[]
│   │   └── Emergency Contacts[]
│   ├── Trips[]
│   │   ├── Trip Overlay (date-bound instructions/tasks)
│   │   ├── Sitter(s) (name + phone)
│   │   ├── Shareable Link settings
│   │   ├── Activity Feed
│   │   └── Trip Report
│   └── Settings (profile, notification preferences)
│
└── Sitter View (no auth required)
    ├── Today View (default landing)
    │   ├── Time-slotted tasks (morning/afternoon/evening/anytime)
    │   ├── Quick access: emergency contacts, vault
    │   └── Tomorrow preview
    ├── Full Manual (searchable)
    │   ├── Sections with instructions + location cards
    │   └── Pet Profiles
    ├── Vault (phone-verified access)
    └── Trip Overlay items (badged)
```

---

## 6. Data Model (Conceptual)

```
Property
  ├── id, name, address, photo, ownerId
  │
  ├── Pets[]
  │     ├── id, name, species, breed, age, photos[]
  │     ├── feedingInstructions, medications[]
  │     ├── vetName, vetPhone
  │     ├── personalityNotes, quirks, allergies, walkingRoutine...
  │     └── locationCards[]
  │
  ├── ManualSections[]
  │     ├── id, title, icon, sortOrder
  │     └── Instructions[]
  │           ├── id, text, sortOrder
  │           └── locationCards[]  {photo/video URL, caption, roomTag}
  │
  ├── VaultItems[]
  │     ├── id, label, encryptedValue, instructions
  │     └── locationCard?
  │
  ├── EmergencyContacts[]
  │     ├── id, name, role, phone, notes
  │     └── sortOrder
  │
  └── Trips[]
        ├── id, startDate, endDate, status (draft/active/completed/expired)
        ├── Sitters[]  {name, phone, vaultAccess: boolean}
        ├── shareLink, linkPassword?, linkExpiry
        ├── OverlayItems[]
        │     ├── id, text, date?, timeSlot?, isRecurring: false
        │     ├── proofRequired: boolean
        │     └── locationCard?
        ├── TaskCompletions[]
        │     ├── id, taskRef, sitterName, completedAt
        │     └── proofPhotoURL?
        ├── VaultAccessLog[]
        │     ├── id, vaultItemId, sitterPhone, accessedAt
        │     └── verified: boolean
        └── ActivityLog[]
              ├── id, eventType, timestamp, sitterName?
              └── metadata {}
```

---

## 7. Explicitly Cut from v1

| Feature | Reason | Phase |
|---|---|---|
| PMS integrations | Not needed for consumer wedge | Phase 2 (STR expansion) |
| AI chatbot / AI content generation | Nice-to-have, not core | Phase 2 |
| Upsell marketplace / revenue tools | STR-specific, premature | Phase 3 |
| Multi-property support | Single property sufficient for v1 persona | Phase 2 |
| Cleaner scheduling / staff assignment | Operations feature | Phase 2 |
| Smart lock integration | Hardware dependency | Phase 2 |
| Multi-language auto-translation | Phase 2 | Phase 2 |
| Custom branding / white-label | B2B feature | Phase 3 |
| Local recommendations / maps | Guidebook territory, not core value | Phase 2 |
| Dual-audience views (cleaner, guest, emergency) | v1 is sitter-only; multi-view is Phase 2 | Phase 2 |
| Native mobile apps (iOS/Android) | PWA first; native if adoption warrants | Phase 2 |
| Sitter-to-sitter vadem | Complex; not v1 | Phase 3 |
| Payment / monetization | Free at launch; validate first | Post-validation |

---

## 8. User Flows

### 8.1 Creator: First-Time Setup

```
Sign up (email/OAuth)
  → "Let's set up your home" (wizard step 1: property name, address, photo)
  → "Add your pets" (wizard step 2: rich pet profile per pet)
  → "Add access info" (wizard step 3: vault items — codes, WiFi)
  → "Emergency contacts" (wizard step 4: vet, neighbor, owner phone)
  → "House instructions" (wizard step 5: section-by-section, add location cards inline)
  → "Review your Vadem" (wizard step 6: preview as sitter would see it)
  → "Ready! Create your first trip when you're ready to travel."
```

### 8.2 Creator: New Trip

```
Dashboard → "New Trip"
  → Set dates (start/end)
  → "Anything different this trip?" (add overlay items or skip)
  → Add sitter(s) (name + phone for vault access)
  → Set proof requirements (toggle per task)
  → Generate link → share via text/email/WhatsApp
  → Trip auto-activates on start date
```

### 8.3 Sitter: Opens the Vadem

```
Receives link via text/email
  → Opens in browser (no download, no signup)
  → Lands on Today View
     → Sees morning/afternoon/evening tasks for today
     → Taps a task → sees instruction + location card (photo/video)
     → Checks off task → optional proof photo upload
     → Taps emergency contacts → tap-to-call
     → Taps vault item → "Verify your phone number" → SMS PIN → sees code
     → Taps "Full Manual" → searchable complete manual
     → Searches "dog food" → jumps to relevant instruction + location card
```

### 8.4 Owner: During the Trip

```
Push notification: "Sarah opened your Vadem"
Push notification: "Sarah accessed alarm code at 2:34 PM"
Push notification: "Sarah completed 'morning feeding' with photo at 7:12 AM"
  → Opens app → Activity Feed → sees chronological log
  → Taps proof photo → views full-size
  → Sees all tasks for today with completion status
```

### 8.5 Post-Trip

```
Trip end date arrives
  → Vault auto-expires (sitter can no longer access codes)
  → Overlay items disappear (manual reverts to baseline)
  → Owner receives "Trip complete" notification
  → Owner opens Trip Report
     → Scrollable recap: tasks completed, proof photos, vault access log
     → Downloads PDF or shares link to report
```

---

## 9. Success Metrics

### Activation Metrics (first 90 days)

| Metric | Target |
|---|---|
| Creator signups | Track growth rate |
| Completed property setups (finished wizard) | >60% of signups |
| Trips created | >40% of completed setups create a trip within 30 days |
| Links shared | >80% of trips result in a shared link |
| Sitter link opens | >90% of shared links are opened |

### Engagement Metrics

| Metric | Target |
|---|---|
| Sitter time on Vadem (first session) | >3 minutes |
| Sitter return visits per trip | >3 visits per trip |
| Tasks checked off per trip | >50% of available tasks |
| Proof photos uploaded (when enabled) | >70% completion rate |
| Search usage by sitters | Track frequency and queries |
| Vault access rate | >80% of sitters with vault access verify |

### Retention / Viral Metrics

| Metric | Target |
|---|---|
| Creator reuse (creates 2nd trip) | >50% within 6 months |
| Sitter-to-creator conversion | >10% of sitters create their own Vadem |
| NPS (creator) | >50 |
| NPS (sitter) | >40 |

---

## 10. Quality Gates

These commands must pass for every user story before it is considered complete:

```bash
pnpm typecheck          # TypeScript type checking (zero errors)
pnpm lint               # ESLint (zero warnings, zero errors)
pnpm build              # Next.js production build succeeds
```

For UI stories, also include:

- **Visual verification in browser** using the dev-browser skill — confirm the component renders correctly, matches the design system, and is responsive
- **Design system compliance** — verify colors, typography, spacing, radius, and shadows match the tokens defined in `vadem-design-system.md`
- **Mobile-first check** — verify at 375px (iPhone SE), 390px (iPhone 14), and 768px (iPad) viewports minimum

For data/API stories:

- **Convex function validation** — confirm queries and mutations work correctly in the Convex dashboard
- **Error handling** — verify graceful failures for network errors, invalid inputs, and edge cases

For security-sensitive stories (vault, auth, sharing):

- **Access control verification** — confirm unauthorized users cannot access restricted data
- **Expiration logic** — confirm time-bound access auto-expires correctly
- **Audit logging** — confirm access events are logged with correct timestamps

### Definition of Done

A story is complete when:

1. All relevant quality gate commands pass
2. Code follows existing project patterns and conventions
3. No `any` types in TypeScript (use proper typing)
4. No `eslint-disable` comments without justification
5. UI matches the design system (fonts, colors, spacing, components)
6. Responsive at all three breakpoints (375px, 390px, 768px)
7. Offline behavior is correct (if applicable to the story)
8. PWA service worker caching is not broken by the change

---

## 11. Epics & User Stories

### Epic 1: Project Foundation & Design System

Scaffolding, tooling, Convex setup, design tokens, and reusable UI components. Everything else depends on this.

---

#### US-001: Initialize Next.js project with TypeScript and tooling
**Description:** As a developer, I need a properly configured Next.js project with TypeScript, ESLint, Prettier, and pnpm so the team has a consistent development environment.

**Acceptance Criteria:**
- [ ] Next.js 14+ app router project initialized with TypeScript strict mode
- [ ] ESLint configured with Next.js recommended rules
- [ ] Prettier configured for consistent formatting
- [ ] `pnpm typecheck`, `pnpm lint`, and `pnpm build` all pass
- [ ] `.gitignore` covers node_modules, .next, .env.local
- [ ] README with setup instructions

**Dependencies:** None

---

#### US-002: Set up Convex backend
**Description:** As a developer, I need Convex.dev configured as the backend so we have real-time data, serverless functions, and file storage from the start.

**Acceptance Criteria:**
- [ ] Convex installed and configured with the Next.js project
- [ ] `convex/` directory initialized with schema file
- [ ] Convex dev server runs alongside Next.js dev server
- [ ] Environment variables for Convex deployment URL configured
- [ ] Basic health-check query works end-to-end

**Dependencies:** US-001

---

#### US-003: Implement design system tokens
**Description:** As a developer, I need all design tokens from `vadem-design-system.md` implemented as CSS custom properties and/or Tailwind config so every component uses consistent styling.

**Acceptance Criteria:**
- [ ] All color tokens implemented (`--primary`, `--secondary`, `--accent`, `--vault`, backgrounds, text, borders, semantic)
- [ ] Typography: Google Fonts loaded (Instrument Serif, Bricolage Grotesque, Caveat), font-family tokens set
- [ ] Type scale tokens (`--text-xs` through `--text-6xl`), line-height, and letter-spacing tokens
- [ ] Spacing scale (`--space-1` through `--space-24`)
- [ ] Border radius tokens (`--radius-sm` through `--radius-round`)
- [ ] Shadow tokens including `--shadow-polaroid`
- [ ] Transition/easing tokens (`--ease-out`, `--ease-spring`, durations)
- [ ] Linen background with subtle noise texture on body
- [ ] Verify in browser: tokens render correctly at 375px and 768px

**Dependencies:** US-001

---

#### US-004: Build core UI components — Buttons
**Description:** As a developer, I need reusable Button components matching the design system so all actions are visually consistent.

**Acceptance Criteria:**
- [ ] Variants: primary (terracotta), secondary (sage), vault (slate), ghost, soft, danger
- [ ] Sizes: lg, default, sm
- [ ] Supports leading icon slot
- [ ] Hover: `translateY(-1px)` + shadow elevation + darker background
- [ ] Active: inner overlay
- [ ] Primary casts colored shadow matching its background
- [ ] Disabled state with reduced opacity
- [ ] Verify in browser at 375px

**Dependencies:** US-003

---

#### US-005: Build core UI components — Inputs & Search Bar
**Description:** As a developer, I need reusable Input, Textarea, and SearchBar components matching the design system.

**Acceptance Criteria:**
- [ ] Text input with label, hint text, and error state support
- [ ] Focus: border changes to `--primary`, focus ring `--primary-subtle`
- [ ] Error: border `--danger`, hint text turns red
- [ ] Textarea with vertical resize, min-height 100px
- [ ] SearchBar: icon inside left padding, sunken default bg, raised bg on focus
- [ ] Placeholder text in `--text-muted`
- [ ] Verify in browser at 375px

**Dependencies:** US-003

---

#### US-006: Build core UI components — Badges & Pills
**Description:** As a developer, I need reusable Badge components for status indicators, room tags, time slots, and trip overlay markers.

**Acceptance Criteria:**
- [ ] Variants: overlay (amber, `✦` prefix), room (neutral), vault (slate, `🔒` prefix), success, warning, danger, time
- [ ] All badges: 12px font, 600 weight, pill radius, consistent padding
- [ ] Room badges accept dynamic room name text
- [ ] Time badges accept time string

**Dependencies:** US-003

---

#### US-007: Build Location Card component
**Description:** As a developer, I need the signature Location Card component — the polaroid-style photo card with handwritten caption that is Vadem's visual identity.

**Acceptance Criteria:**
- [ ] Card structure: photo (4:3 aspect ratio) + Caveat-font caption + room badge
- [ ] Photo with `--radius-md`, `object-fit: cover`
- [ ] `--shadow-polaroid` shadow
- [ ] Supports tilt variants: tilted-left (-1.5deg), neutral (0deg), tilted-right (+1.2deg)
- [ ] Hover: `translateY(-4px)` + rotation shift + `--shadow-xl`
- [ ] Tappable — expands to full-screen photo/video on click
- [ ] Placeholder state when no image uploaded
- [ ] 280px default width, responsive in grid contexts
- [ ] Verify in browser: visual matches design system polaroid spec

**Dependencies:** US-003, US-006

---

#### US-008: Build Pet Profile Card component
**Description:** As a developer, I need the Pet Profile Card component — the emotional core of the product — displaying the pet's photo as hero with structured details below.

**Acceptance Criteria:**
- [ ] Hero photo: 1:1 aspect ratio, full bleed, `object-fit: cover`
- [ ] Name in Instrument Serif `text-3xl`
- [ ] Breed + age in `text-sm` muted
- [ ] Detail rows with emoji icons: feeding, medications, walking, vet (tap-to-call in sage)
- [ ] Personality note in Caveat font on `--accent-subtle` background
- [ ] `--radius-xl`, `--shadow-md`, hover lifts to `--shadow-lg`
- [ ] Placeholder gradient when no photo
- [ ] Max width 360px
- [ ] Verify in browser at 375px

**Dependencies:** US-003, US-006

---

#### US-009: Build Task Item component
**Description:** As a developer, I need the Task Item component with interactive check-off, proof button, and overlay badge support.

**Acceptance Criteria:**
- [ ] Structure: checkbox + body (text + meta badges) + optional proof button
- [ ] Checkbox: 26px, `--radius-sm`, `--border-strong` border
- [ ] Check animation: fills `--secondary`, white checkmark SVG, spring bounce (`checkPop` keyframe)
- [ ] Completed state: `--secondary-subtle` bg, text strikethrough in muted
- [ ] Overlay state: 3px left border in `--accent`, overlay badge in meta
- [ ] Proof button: dashed border, camera icon, hover turns terracotta
- [ ] Time badge and room badge in meta row
- [ ] Hover: border darkens + `--shadow-sm`
- [ ] Click toggles completion state
- [ ] Verify in browser: spring animation feels satisfying

**Dependencies:** US-003, US-006

---

#### US-010: Build Vault Item component
**Description:** As a developer, I need the Vault Item component with revealed, locked, and hidden states.

**Acceptance Criteria:**
- [ ] Structure: icon + label/hint + value or verify button
- [ ] Icon: 44px, `--radius-md`, `--vault` background, white icon
- [ ] Revealed state: `--secondary-subtle` bg, code visible in monospace, `letter-spacing: 0.15em`
- [ ] Locked state (unverified): fully hidden, message "verify your phone number to view" + verify button
- [ ] No blurred/teased state for unregistered viewers
- [ ] `--vault-subtle` background, `--vault-light` border

**Dependencies:** US-003, US-004

---

#### US-011: Build Emergency Contact Bar component
**Description:** As a developer, I need a horizontally scrollable emergency contact bar for quick tap-to-call access.

**Acceptance Criteria:**
- [ ] Horizontal scroll with `-webkit-overflow-scrolling: touch`
- [ ] Per contact: 36px round icon (color-coded by role) + name + role + "Call" link
- [ ] Icon colors: owner (`--primary-light`), vet (`--secondary-light`), neighbor (`--accent-light`), emergency (`--danger-light`)
- [ ] Hover: border `--secondary`, bg `--secondary-subtle`
- [ ] `tel:` href for tap-to-call on mobile
- [ ] `min-width: max-content` per contact chip

**Dependencies:** US-003

---

#### US-012: Build Today View Header component
**Description:** As a developer, I need the Today View header that sets context for the sitter — greeting, date, and task summary stats.

**Acceptance Criteria:**
- [ ] Gradient background: `--primary` to `--primary-hover` (135deg)
- [ ] Decorative circle: `rgba(255,255,255,0.06)` top-right
- [ ] Bottom radius: `--radius-2xl`
- [ ] Greeting: Instrument Serif, `text-3xl`, white, uses sitter name
- [ ] Date line: `text-sm`, 80% opacity, shows day X of Y
- [ ] Summary stats: glassmorphism chips (tasks today, completed, proof needed)

**Dependencies:** US-003

---

#### US-013: Build Wizard Progress Indicator component
**Description:** As a developer, I need a 6-step wizard progress indicator for the guided setup flow.

**Acceptance Criteria:**
- [ ] 6 steps: Home, Pets, Access, Contacts, Instructions, Review
- [ ] Completed: sage dot with checkmark, sage label
- [ ] Active: terracotta dot with number, terracotta label, colored shadow
- [ ] Upcoming: border-outlined dot, muted number and label
- [ ] Connector lines between steps: sage when completed, `--border` otherwise
- [ ] Horizontally scrollable on narrow screens

**Dependencies:** US-003

---

#### US-014: Build Section Navigation component
**Description:** As a developer, I need horizontal scrollable pills for navigating manual sections in the sitter view.

**Acceptance Criteria:**
- [ ] Pill per section: emoji + text, `--radius-pill`
- [ ] Active: `--primary` background, white text
- [ ] Inactive: `--bg-raised`, `--border`, `--text-secondary`
- [ ] Hover: `--bg-sunken`
- [ ] Horizontal scroll with smooth behavior

**Dependencies:** US-003, US-006

---

#### US-015: Build Notification Toast component
**Description:** As a developer, I need toast notification components for owner-facing event alerts.

**Acceptance Criteria:**
- [ ] Variants: success (sage left border), vault (slate left border), warning (amber left border)
- [ ] Structure: icon + title + message + timestamp
- [ ] Entrance animation: slide from right with spring easing, 0.5s
- [ ] Max width 380px
- [ ] Auto-dismiss after 5 seconds with manual close option

**Dependencies:** US-003

---

#### US-016: Build Bottom Navigation component
**Description:** As a developer, I need the 4-tab mobile bottom navigation for the sitter view.

**Acceptance Criteria:**
- [ ] 4 tabs: Today, Manual, Vault, Contacts
- [ ] Active tab: `--primary` color
- [ ] Inactive: `--text-muted`
- [ ] Tab label: `text-xs`, 500 weight
- [ ] Top border radius `--radius-xl`, upward shadow
- [ ] Fixed to bottom of viewport on mobile

**Dependencies:** US-003

---

#### US-017: Build Time Slot Divider component
**Description:** As a developer, I need time slot dividers to separate morning/afternoon/evening task groups in the Today View.

**Acceptance Criteria:**
- [ ] Variants: morning (☀️, `--accent-light`), afternoon (⛅, `--primary-light`), evening (🌙, `--vault-light`)
- [ ] 32px round icon + uppercase label + horizontal line filling remaining width

**Dependencies:** US-003

---

#### US-018: Build Activity Feed Item component
**Description:** As a developer, I need activity feed item components for the owner's chronological log.

**Acceptance Criteria:**
- [ ] Color-coded 8px dots: view (terracotta), task (sage), vault (slate), proof (amber)
- [ ] Text with bold name, `text-sm`, timestamp in `text-xs` muted
- [ ] Items separated by 1px bottom border

**Dependencies:** US-003

---

#### US-019: Configure PWA manifest and service worker
**Description:** As a developer, I need PWA configuration so the app is installable and supports offline access.

**Acceptance Criteria:**
- [ ] `manifest.json` with app name "Vadem", theme color `#C2704A`, background `#FAF6F1`
- [ ] App icons at required sizes (192px, 512px)
- [ ] Service worker registered with basic caching strategy
- [ ] "Add to Home Screen" prompt works on iOS and Android
- [ ] Verify: app loads offline after first visit (basic shell)

**Dependencies:** US-001

---

#### US-020: Set up responsive layout shell
**Description:** As a developer, I need the responsive app layout shell with creator dashboard layout and sitter view layout.

**Acceptance Criteria:**
- [ ] Creator layout: sidebar nav (desktop), bottom nav (mobile), main content area
- [ ] Sitter layout: full-width mobile-first, bottom navigation, today view as default
- [ ] Breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop)
- [ ] Max content width constrained appropriately per view
- [ ] Verify at all 3 breakpoints

**Dependencies:** US-001, US-003, US-016

---

### Epic 2: Creator Authentication

Signup, login, OAuth, session management. Required before any creator features.

---

#### US-021: Creator signup with email and password
**Description:** As a new user, I want to create an account with email and password so I can start building my Vadem.

**Acceptance Criteria:**
- [ ] Signup form: email, password, confirm password
- [ ] Password validation: minimum 8 characters
- [ ] Email uniqueness check with clear error message
- [ ] On success: redirect to wizard (US-028)
- [ ] Convex auth integration configured
- [ ] Form matches design system (inputs, buttons, error states)

**Dependencies:** US-002, US-004, US-005

---

#### US-022: Creator login
**Description:** As a returning user, I want to log in with my email and password so I can access my dashboard.

**Acceptance Criteria:**
- [ ] Login form: email, password
- [ ] Invalid credentials show clear error message
- [ ] On success: redirect to creator dashboard
- [ ] "Forgot password" link (can be placeholder for v1)
- [ ] Session persists across browser refreshes

**Dependencies:** US-021

---

#### US-023: OAuth login (Google, Apple)
**Description:** As a user, I want to sign up or log in with Google or Apple so I can get started without creating a password.

**Acceptance Criteria:**
- [ ] Google OAuth button on signup and login pages
- [ ] Apple OAuth button on signup and login pages
- [ ] New OAuth user creates account automatically
- [ ] Returning OAuth user logs in seamlessly
- [ ] OAuth accounts linked to same email merge correctly

**Dependencies:** US-021

---

#### US-024: Creator dashboard shell
**Description:** As a logged-in creator, I want to see my dashboard with my property, active trip status, and recent activity so I have a home base.

**Acceptance Criteria:**
- [ ] Dashboard shows: property summary card, active trip status (or "Create your first trip" CTA), recent activity preview
- [ ] Navigation to: My Property (edit manual), Trips, Settings
- [ ] Empty state for new users with no property: "Let's set up your home" CTA leading to wizard
- [ ] Responsive at all breakpoints
- [ ] Logout option accessible from settings/menu

**Dependencies:** US-020, US-021

---

### Epic 3: Property Manual & Guided Wizard

The core content creation flow. Creator builds the permanent manual through a guided wizard.

---

#### US-025: Property data model in Convex
**Description:** As a developer, I need the Property schema in Convex with all related tables so the manual can be stored and queried.

**Acceptance Criteria:**
- [ ] Property table: id, name, address, photo (file reference), ownerId
- [ ] ManualSections table: id, propertyId, title, icon, sortOrder
- [ ] Instructions table: id, sectionId, text, sortOrder, timeSlot (morning/afternoon/evening/anytime), isRecurring, proofRequired
- [ ] LocationCards table: id, parentId, parentType (instruction/pet/vault), photoUrl, videoUrl, caption, roomTag
- [ ] All tables have proper indexes for querying
- [ ] Convex mutations for CRUD on each table

**Dependencies:** US-002

---

#### US-026: Wizard step 1 — Add your home
**Description:** As a creator, I want to add my home's name, address, and photo so the manual has a property identity.

**Acceptance Criteria:**
- [ ] Fields: property name (required), address (optional), photo upload (optional)
- [ ] Photo upload: preview thumbnail after selection, stored via Convex file storage
- [ ] "Next" button proceeds to step 2
- [ ] "Save & finish later" option persists partial data
- [ ] Wizard progress indicator shows step 1 active
- [ ] Verify in browser at 375px

**Dependencies:** US-005, US-013, US-025

---

#### US-027: Wizard step 2 — Add your pets
**Description:** As a creator, I want to add my pets with rich profiles so the sitter has complete care information.

**Acceptance Criteria:**
- [ ] "Add a pet" button opens pet profile form
- [ ] Required fields: photo, name, species/breed, age, feeding instructions, vet name + phone
- [ ] Optional fields: personality notes, medical conditions, medications (with schedule), behavioral quirks, allergies, microchip, walking routine, grooming, comfort items
- [ ] Can add multiple pets (repeat form)
- [ ] Each field supports attaching a location card (US-037)
- [ ] Wizard progress indicator shows step 2 active
- [ ] "Skip" option if no pets (unlikely but allowed)

**Dependencies:** US-026, US-030

---

#### US-028: Wizard step 3 — Add access info (vault items)
**Description:** As a creator, I want to add my door codes, WiFi password, and alarm code during setup so they're ready for sharing.

**Acceptance Criteria:**
- [ ] Pre-built item types: door code, alarm code, WiFi, gate code, garage code, safe combination, custom
- [ ] Each item: label, value (masked input), instruction text, optional location card
- [ ] "Add another" button for multiple items
- [ ] Values stored securely (see Epic 7 for encryption)
- [ ] "Skip" option — vault items can be added later

**Dependencies:** US-026, US-049

---

#### US-029: Wizard step 4 — Emergency contacts
**Description:** As a creator, I want to add emergency contacts during setup so the sitter always has tap-to-call access.

**Acceptance Criteria:**
- [ ] Pre-filled slot: ASPCA Poison Control (888-426-4435)
- [ ] Default slots to fill: Owner primary, Owner secondary/partner, Veterinarian, Emergency neighbor
- [ ] Each contact: name, role, phone number, optional notes
- [ ] Drag to reorder or manual sort order
- [ ] "Add another" for additional contacts

**Dependencies:** US-026, US-057

---

#### US-030: Pet profile data model in Convex
**Description:** As a developer, I need the Pet schema in Convex so pet profiles can be stored with all required and optional fields.

**Acceptance Criteria:**
- [ ] Pets table: id, propertyId, name, species, breed, age, photos (file references array), feedingInstructions, vetName, vetPhone, personalityNotes, medicalConditions, medications (array of {name, dosage, frequency, time, locationCardId}), behavioralQuirks, allergies, microchipNumber, insuranceInfo, walkingRoutine, groomingNeeds, comfortItems, sortOrder
- [ ] Queries: get pets by propertyId
- [ ] Mutations: create, update, delete pet

**Dependencies:** US-002

---

#### US-031: Wizard step 5 — House instructions by section
**Description:** As a creator, I want to add house instructions organized by section so the manual is structured and searchable.

**Acceptance Criteria:**
- [ ] Pre-built sections offered: Access & Arrival, Appliances, Kitchen, Trash & Mail, Plants & Garden, Where Things Are, House Rules, Departure / Lockup
- [ ] Creator can select which sections to include (checkbox list)
- [ ] Per section: add multiple instructions (text + optional location card + optional time slot + proof toggle)
- [ ] Reorder instructions within a section via drag or arrows
- [ ] "Add custom section" option with custom title and icon
- [ ] Each instruction can attach a location card inline

**Dependencies:** US-026, US-025

---

#### US-032: Wizard step 6 — Review & publish
**Description:** As a creator, I want to review my complete Vadem before publishing so I can catch any missing information.

**Acceptance Criteria:**
- [ ] Preview renders the manual as the sitter would see it (read-only sitter view)
- [ ] Summary checklist: property ✓, X pets ✓, X vault items ✓, X contacts ✓, X sections with Y instructions ✓
- [ ] Incomplete items highlighted with warning badges
- [ ] "Edit" link per section jumps back to relevant wizard step
- [ ] "Publish" button finalizes the manual and lands on dashboard
- [ ] Manual status changes from "draft" to "published"

**Dependencies:** US-026, US-027, US-028, US-029, US-031

---

#### US-033: Edit manual sections after wizard
**Description:** As a creator, I want to edit, add, reorder, or delete manual sections after the initial wizard so I can keep the manual updated.

**Acceptance Criteria:**
- [ ] Access from dashboard → My Property → edit sections
- [ ] Add new section, edit section title/icon, delete section (with confirmation)
- [ ] Reorder sections via drag or arrows
- [ ] Add/edit/delete instructions within a section
- [ ] Attach/detach location cards on existing instructions
- [ ] Changes save in real-time (Convex mutations)

**Dependencies:** US-025, US-032

---

#### US-034: Edit pet profiles after wizard
**Description:** As a creator, I want to edit or add pet profiles after the initial wizard so I can update care details.

**Acceptance Criteria:**
- [ ] Access from dashboard → My Property → Pets
- [ ] Edit any field on existing pet profiles
- [ ] Add new pets
- [ ] Delete a pet (with confirmation)
- [ ] Reorder pets
- [ ] Changes reflected immediately for any active sitter view

**Dependencies:** US-030, US-032

---

#### US-035: Full-text search across manual (sitter-side)
**Description:** As a sitter, I want to search the entire manual so I can quickly find "dog food" or "thermostat" without scrolling.

**Acceptance Criteria:**
- [ ] Search bar at top of manual view (design system SearchBar component)
- [ ] Searches across: instruction text, section titles, pet profile fields, location card captions
- [ ] Results show matching instruction with context snippet + section name
- [ ] Tap result jumps to that instruction with location card visible
- [ ] Search works offline (indexes cached content)
- [ ] Empty state: "No results for [query]"

**Dependencies:** US-014, US-005, US-025

---

#### US-036: Manual sitter view with section navigation
**Description:** As a sitter, I want to browse the full manual organized by sections so I can find anything I need beyond today's tasks.

**Acceptance Criteria:**
- [ ] Section navigation pills at top (US-014)
- [ ] Tapping a section scrolls to that section
- [ ] Instructions displayed with inline location cards
- [ ] Pet profiles rendered with Pet Profile Card component
- [ ] Emergency contacts accessible from this view
- [ ] Accessible via "Manual" tab in bottom navigation

**Dependencies:** US-007, US-008, US-014, US-025

---

### Epic 4: Location Cards

Photo/video attachment system — the product's signature UX.

---

#### US-037: Upload photo for location card
**Description:** As a creator, I want to upload a photo for a location card so the sitter can see exactly where something is.

**Acceptance Criteria:**
- [ ] Photo upload via file picker or camera capture (mobile)
- [ ] Image compression/resize before upload (max 1920px wide)
- [ ] Preview thumbnail after upload
- [ ] Stored via Convex file storage
- [ ] Caption text field (Caveat font in display)
- [ ] Room/area tag selector (predefined list + custom)

**Dependencies:** US-025

---

#### US-038: Upload video for location card
**Description:** As a creator, I want to upload a short video (30s max) for a location card so I can show a walkthrough.

**Acceptance Criteria:**
- [ ] Video upload via file picker or camera capture
- [ ] 30-second maximum enforced (trim or reject)
- [ ] Video preview/thumbnail generated
- [ ] Stored via Convex file storage
- [ ] Play icon overlay on thumbnail in card display
- [ ] Caption and room tag same as photo cards

**Dependencies:** US-025

---

#### US-039: Location card display (sitter view)
**Description:** As a sitter, I want to see location cards inline with instructions so I can find things without asking the owner.

**Acceptance Criteria:**
- [ ] Location card renders inline below the instruction it's attached to
- [ ] Polaroid style per design system: photo + Caveat caption + room badge
- [ ] Tappable to expand to full-screen photo/video viewer
- [ ] Full-screen viewer: pinch-to-zoom on photo, play controls on video, close button
- [ ] Multiple location cards on one instruction stack in a horizontal scroll
- [ ] Images cached by service worker for offline access

**Dependencies:** US-007, US-037, US-038

---

### Epic 5: Trip Overlay & Today View

Trip creation, time-bound overlay content, and the sitter's contextual landing page.

---

#### US-040: Trip data model in Convex
**Description:** As a developer, I need the Trip schema with overlay items, sitter list, and task completion tracking.

**Acceptance Criteria:**
- [ ] Trips table: id, propertyId, startDate, endDate, status (draft/active/completed/expired), shareLink, linkPassword, linkExpiry
- [ ] Sitters table: id, tripId, name, phone, vaultAccess (boolean)
- [ ] OverlayItems table: id, tripId, text, date, timeSlot, proofRequired, locationCardId
- [ ] TaskCompletions table: id, tripId, taskRef (instructionId or overlayItemId), taskType (recurring/overlay), sitterName, completedAt, proofPhotoUrl
- [ ] Indexes on tripId, propertyId, status
- [ ] Query: get active trip for property

**Dependencies:** US-002, US-025

---

#### US-041: Create new trip
**Description:** As a creator, I want to create a new trip with start and end dates so I can prepare for an upcoming absence.

**Acceptance Criteria:**
- [ ] "New Trip" button on dashboard
- [ ] Date picker: start date and end date (end must be after start)
- [ ] Cannot create a trip if another trip is active (one at a time for v1)
- [ ] Trip created in "draft" status
- [ ] Redirects to trip setup flow (overlay items → sitters → proof settings → share)

**Dependencies:** US-024, US-040

---

#### US-042: Add overlay items to trip
**Description:** As a creator, I want to add trip-specific instructions that don't belong in the permanent manual so the sitter knows what's different this week.

**Acceptance Criteria:**
- [ ] "Anything different this trip?" screen after setting dates
- [ ] Add overlay item: text, optional specific date, time slot, proof required toggle
- [ ] Optional location card attachment per overlay item
- [ ] Pre-filled suggestions: "Any medication changes?", "Any scheduled visitors?", "Any special instructions?"
- [ ] "Skip" option if nothing is different
- [ ] Overlay items saved to OverlayItems table

**Dependencies:** US-040, US-041

---

#### US-043: Add sitters to trip
**Description:** As a creator, I want to add sitter(s) by name and phone number so they can be granted vault access.

**Acceptance Criteria:**
- [ ] Add sitter form: name (required), phone number (required), vault access toggle (default: on)
- [ ] Phone number validation (US format for v1)
- [ ] Can add multiple sitters
- [ ] Sitter list displayed with edit/remove options
- [ ] Sitter data saved to Sitters table

**Dependencies:** US-040, US-041

---

#### US-044: Set proof requirements per task
**Description:** As a creator, I want to toggle photo proof on/off per task before sharing so I control the accountability level.

**Acceptance Criteria:**
- [ ] List of all tasks (recurring from manual + overlay items) with proof toggle per task
- [ ] Default: all toggles OFF
- [ ] Recommendation text: "We suggest 1-3 proof items per day"
- [ ] Count of proof-required tasks shown
- [ ] Settings saved to instruction/overlay `proofRequired` field

**Dependencies:** US-040, US-042

---

#### US-045: Trip overlay auto-expiration
**Description:** As a system, I need to automatically expire trips and overlay content when the end date passes so the manual reverts to baseline.

**Acceptance Criteria:**
- [ ] Scheduled Convex function checks for expired trips (daily or on access)
- [ ] Trip status changes from "active" to "expired" when endDate < now
- [ ] Overlay items no longer appear in sitter view after expiration
- [ ] Vault access revoked automatically on expiration (see US-055)
- [ ] Owner receives "Trip complete" notification

**Dependencies:** US-040

---

#### US-046: Today View — sitter landing page
**Description:** As a sitter, I want to land on the Today View when I open the Vadem link so I see only what's relevant right now.

**Acceptance Criteria:**
- [ ] Today View is the default screen when sitter opens the link
- [ ] Header: greeting with sitter name (if registered) or generic, trip dates, day X of Y, task summary stats
- [ ] Emergency contact bar below header
- [ ] Time-slotted task list: Morning, Afternoon, Evening, Anytime sections with dividers
- [ ] Recurring tasks from manual populate daily
- [ ] One-time overlay tasks populate on their specific date
- [ ] Trip overlay items show amber overlay badge
- [ ] "Full Manual" accessible via bottom nav
- [ ] Tomorrow preview: collapsed section at bottom

**Dependencies:** US-009, US-011, US-012, US-017, US-040, US-025

---

#### US-047: Daily task reset logic
**Description:** As a system, I need tasks to reset each day so the sitter sees a fresh checklist every morning.

**Acceptance Criteria:**
- [ ] Task completion status is per-day (completions logged with date)
- [ ] New day = all recurring tasks unchecked
- [ ] Previous day's completions preserved in activity log and trip report
- [ ] Overlay items for a specific past date no longer appear in Today View
- [ ] "Yesterday" tasks not shown (only today and tomorrow preview)

**Dependencies:** US-040, US-046

---

### Epic 6: Secure Vault

Encrypted credential storage, SMS PIN verification, access logging, auto-expiration.

---

#### US-048: Vault data model and encryption
**Description:** As a developer, I need vault items stored with encryption at rest so sensitive credentials are protected.

**Acceptance Criteria:**
- [ ] VaultItems table: id, propertyId, label, encryptedValue, instructions, locationCardId, itemType (door/alarm/wifi/gate/garage/safe/custom)
- [ ] Values encrypted before storage (server-side encryption via Convex action)
- [ ] Decryption only on authorized access (phone-verified sitter during active trip)
- [ ] Encryption key management strategy documented

**Dependencies:** US-002

---

#### US-049: Create and manage vault items
**Description:** As a creator, I want to add, edit, and delete vault items so I can store and update my sensitive codes.

**Acceptance Criteria:**
- [ ] Create: select type → enter label, value (masked input with reveal toggle), instructions, optional location card
- [ ] Edit: update any field, re-encrypt on value change
- [ ] Delete: with confirmation dialog
- [ ] List view on dashboard showing labels (values always masked for creator too until reveal)
- [ ] Accessible from wizard step 3 and from dashboard → My Property

**Dependencies:** US-048, US-010

---

#### US-050: SMS PIN verification flow
**Description:** As a sitter, I want to verify my phone number via SMS PIN so I can access vault items securely.

**Acceptance Criteria:**
- [ ] Sitter taps vault tab or vault item → sees "Verify your phone number to view" message
- [ ] System sends 6-digit PIN via SMS to the phone number the owner registered for this sitter
- [ ] Sitter enters PIN → validated against stored PIN
- [ ] PIN expires after 10 minutes
- [ ] Max 3 attempts per PIN; new PIN required after 3 failures
- [ ] On success: vault items revealed for this session
- [ ] One verification per session (not per item)
- [ ] SMS delivery via Twilio or similar (Convex action)

**Dependencies:** US-043, US-048

---

#### US-051: Vault access for verified sitters
**Description:** As a verified sitter, I want to see decrypted vault items so I can access door codes, WiFi, and alarm codes.

**Acceptance Criteria:**
- [ ] After PIN verification, vault items display with Vault Item component (revealed state)
- [ ] Monospace code display, copy-to-clipboard button
- [ ] Instructions text and location card visible with the code
- [ ] If trip is not active (before start or after end), vault returns "This vadem is not currently active"
- [ ] If sitter phone not registered for this trip, vault returns "You don't have access to secure items"

**Dependencies:** US-050, US-010

---

#### US-052: Vault access logging
**Description:** As a system, I need to log every vault access event so the owner has a complete audit trail.

**Acceptance Criteria:**
- [ ] VaultAccessLog table: id, tripId, vaultItemId, sitterPhone, sitterName, accessedAt, verified (boolean)
- [ ] Log entry created when sitter views a decrypted vault item
- [ ] Log entry includes which specific item was accessed
- [ ] Failed verification attempts also logged (verified: false)

**Dependencies:** US-050

---

#### US-053: Owner notification on vault access
**Description:** As an owner, I want to be notified immediately when someone accesses a vault item so I have peace of mind.

**Acceptance Criteria:**
- [ ] Push notification: "[Sitter name] accessed your [item label] at [time]"
- [ ] Notification links to activity feed
- [ ] Activity feed shows vault access events with slate dot

**Dependencies:** US-052, US-078

---

#### US-054: Vault auto-expiration on trip end
**Description:** As a system, I need vault access to automatically expire when the trip ends so codes aren't accessible indefinitely.

**Acceptance Criteria:**
- [ ] Vault queries check trip status — only return items if trip is "active"
- [ ] When trip expires (US-045), subsequent vault access attempts show "This trip has ended"
- [ ] No action required by owner — automatic

**Dependencies:** US-045, US-048

---

#### US-055: One-click vault access revocation
**Description:** As an owner, I want to instantly revoke vault access for a sitter so I can respond to security concerns.

**Acceptance Criteria:**
- [ ] "Revoke Access" button per sitter on trip management page
- [ ] Confirmation dialog: "Revoke vault access for [name]?"
- [ ] On confirm: sitter's vaultAccess set to false immediately
- [ ] Sitter sees "Your access has been revoked" on next vault attempt
- [ ] Owner receives confirmation toast

**Dependencies:** US-043, US-004

---

#### US-056: Vault hidden state for unregistered viewers
**Description:** As a sitter without vault access, I should not see any vault content — not even blurred — so there's no false sense of access.

**Acceptance Criteria:**
- [ ] If sitter phone not registered for trip: vault tab shows "Sarah shared secure info with you — verify your phone number to view"
- [ ] No blurred codes, no item labels, no teaser content
- [ ] If link is forwarded to someone not registered: same message, no vault content
- [ ] Vault tab badge shows lock icon to indicate content exists

**Dependencies:** US-010, US-050

---

### Epic 7: Emergency Contacts

Contact management and tap-to-call for sitters.

---

#### US-057: Emergency contact data model
**Description:** As a developer, I need the EmergencyContacts schema in Convex.

**Acceptance Criteria:**
- [ ] EmergencyContacts table: id, propertyId, name, role, phone, notes, sortOrder
- [ ] Queries: get contacts by propertyId, ordered by sortOrder
- [ ] Mutations: create, update, delete, reorder
- [ ] Pre-seed: ASPCA Poison Control (888-426-4435) as default

**Dependencies:** US-002

---

#### US-058: Add and manage emergency contacts
**Description:** As a creator, I want to add, edit, reorder, and delete emergency contacts.

**Acceptance Criteria:**
- [ ] Add contact form: name, role (dropdown: Owner, Partner, Veterinarian, Neighbor, Emergency, Custom), phone, notes
- [ ] Edit any contact inline
- [ ] Delete with confirmation
- [ ] Drag to reorder
- [ ] Poison control pre-filled and non-deletable (but editable)
- [ ] Accessible from wizard step 4 and dashboard → My Property

**Dependencies:** US-057, US-005

---

#### US-059: Emergency contact display (sitter view)
**Description:** As a sitter, I want to see emergency contacts with tap-to-call so I can reach the right person instantly.

**Acceptance Criteria:**
- [ ] Emergency Contact Bar rendered on Today View and accessible from every screen
- [ ] Tap contact → initiates phone call (`tel:` link)
- [ ] Contacts ordered by creator's sort order
- [ ] Color-coded icons by role per design system
- [ ] Accessible via "Contacts" tab in bottom navigation as a full-page view with notes visible

**Dependencies:** US-011, US-057

---

### Epic 8: Task System & Photo Proof

Task check-off, timestamps, photo proof upload, and sitter attribution.

---

#### US-060: Task check-off (anonymous)
**Description:** As a sitter, I want to check off tasks without creating an account so completing my duties is frictionless.

**Acceptance Criteria:**
- [ ] Tap checkbox → task marked complete with spring animation
- [ ] Timestamp logged: TaskCompletions entry with completedAt
- [ ] No login/signup required
- [ ] Completed tasks show checkmark but remain visible (not hidden)
- [ ] Check-off works offline (queued locally, synced when online)

**Dependencies:** US-009, US-040, US-046

---

#### US-061: Photo proof upload
**Description:** As a sitter, I want to upload a photo as proof of task completion so the owner has peace of mind.

**Acceptance Criteria:**
- [ ] Tasks with proof required show camera button
- [ ] Tap camera → opens camera (mobile) or file picker (desktop)
- [ ] Sitter enters name before upload (pre-filled if owner registered them)
- [ ] Photo uploaded to Convex file storage, URL saved in TaskCompletions
- [ ] Upload works offline (queued locally with photo, synced when online)
- [ ] Owner sees "[name] marked [task] complete at [time]" with photo in activity feed

**Dependencies:** US-060, US-040

---

#### US-062: Owner views task completions and proof
**Description:** As an owner, I want to see which tasks were completed and view proof photos so I know everything was handled.

**Acceptance Criteria:**
- [ ] Activity feed shows task completion events with sitter name and timestamp
- [ ] Proof photo thumbnail in feed, tappable to full-size viewer
- [ ] Dashboard shows today's task completion summary (X of Y done)
- [ ] Can filter activity feed by event type (tasks only, proof only)

**Dependencies:** US-018, US-061

---

### Epic 9: Sharing & Link Management

Link generation, password protection, expiration, and the sitter routing experience.

---

#### US-063: Generate shareable link
**Description:** As a creator, I want to generate a unique shareable link for my trip so I can send it to the sitter.

**Acceptance Criteria:**
- [ ] "Share" button on trip setup (final step) and on active trip dashboard
- [ ] Generates unique URL (e.g., `vadem.app/t/[unique-id]`)
- [ ] Copy-to-clipboard button with success toast
- [ ] Share via native Web Share API (text, email, WhatsApp on mobile)
- [ ] Link stored in Trips table

**Dependencies:** US-040, US-041

---

#### US-064: Link password protection
**Description:** As a creator, I want to optionally password-protect the Vadem link so only intended recipients can view it.

**Acceptance Criteria:**
- [ ] Toggle: "Require password to view" (default: off)
- [ ] If on: creator sets a simple password (separate from vault PIN)
- [ ] Sitter opening the link sees a password prompt before any content
- [ ] Incorrect password shows error, allows retry
- [ ] Password stored hashed in Trips table

**Dependencies:** US-063

---

#### US-065: Link expiration
**Description:** As a creator, I want the link to automatically expire when the trip ends so old links don't grant indefinite access.

**Acceptance Criteria:**
- [ ] Link expiration auto-set to trip end date
- [ ] Creator can optionally adjust expiry (earlier, not later than trip end)
- [ ] After expiry: link shows "This vadem has expired" message
- [ ] Expired links cannot access any content (manual, vault, tasks)

**Dependencies:** US-063, US-045

---

#### US-066: Regenerate/revoke link
**Description:** As a creator, I want to regenerate the link so I can revoke access for all previous recipients.

**Acceptance Criteria:**
- [ ] "Reset Link" button on trip management page
- [ ] Confirmation dialog: "This will revoke access for anyone with the current link"
- [ ] Generates a new unique URL, old URL returns "This link is no longer valid"
- [ ] New link must be shared again with sitters

**Dependencies:** US-063

---

#### US-067: Sitter view routing
**Description:** As a sitter, I want to open the shared link and immediately see the Today View without any download or signup.

**Acceptance Criteria:**
- [ ] Link opens in browser, no app download prompt
- [ ] If password-protected: password screen first → then Today View
- [ ] If trip not yet started: "This vadem starts on [date]" with preview of property name and pet names
- [ ] If trip active: Today View (US-046)
- [ ] If trip expired: "This vadem has ended" with friendly message
- [ ] Bottom navigation: Today, Manual, Vault, Contacts
- [ ] Service worker caches on first load for offline access

**Dependencies:** US-046, US-064, US-065, US-016

---

### Epic 10: Notifications & Activity Feed

Push notifications, in-app activity log, and notification preferences.

---

#### US-068: Activity feed data model
**Description:** As a developer, I need an ActivityLog schema to store all sitter interaction events.

**Acceptance Criteria:**
- [ ] ActivityLog table: id, tripId, eventType (link_opened/task_completed/proof_uploaded/vault_accessed/trip_started/trip_expired), timestamp, sitterName, sitterPhone, metadata (JSON: taskRef, vaultItemId, proofPhotoUrl, etc.)
- [ ] Index on tripId + timestamp for chronological queries
- [ ] Mutation: logEvent (called from other mutations/actions)

**Dependencies:** US-002, US-040

---

#### US-069: Activity feed display
**Description:** As an owner, I want to see a chronological activity feed so I can track everything the sitter does.

**Acceptance Criteria:**
- [ ] Feed in trip detail view and on dashboard for active trip
- [ ] Events rendered with Activity Feed Item component (color-coded dots)
- [ ] Events: link opened (terracotta), task completed (sage), proof uploaded (amber), vault accessed (slate)
- [ ] Filterable by event type
- [ ] Feed persists after trip ends (available in trip report)
- [ ] Real-time updates via Convex subscriptions

**Dependencies:** US-018, US-068

---

#### US-070: Web push notification setup
**Description:** As a developer, I need web push notifications configured so the owner can receive real-time alerts.

**Acceptance Criteria:**
- [ ] Web Push API configured with VAPID keys
- [ ] Service worker handles push events
- [ ] Permission prompt shown to creator on first login (not to sitters)
- [ ] Push subscription stored in user settings
- [ ] Fallback: if push denied, notifications only in-app

**Dependencies:** US-019

---

#### US-071: Push notification — sitter opened link
**Description:** As an owner, I want to be notified when the sitter first opens my Vadem so I know they received it.

**Acceptance Criteria:**
- [ ] Push notification: "Sarah opened your Vadem"
- [ ] Triggered once per sitter per trip (first open only)
- [ ] Activity log entry created simultaneously

**Dependencies:** US-068, US-070

---

#### US-072: Push notification — task completed
**Description:** As an owner, I want to be notified when the sitter completes tasks so I can track progress.

**Acceptance Criteria:**
- [ ] Push notification: "Sarah completed 'morning feeding'" (or with photo: "...with photo at 7:12 AM")
- [ ] Respects owner notification preferences (all tasks / proof-only / digest)
- [ ] Digest mode: batch notifications into one summary per hour

**Dependencies:** US-060, US-068, US-070

---

#### US-073: Push notification — vault accessed
**Description:** As an owner, I want to be notified immediately when someone accesses a vault item.

**Acceptance Criteria:**
- [ ] Push notification: "Sarah accessed your alarm code at 2:34 PM"
- [ ] Always sent (not suppressible — security event)
- [ ] Activity log entry created simultaneously

**Dependencies:** US-052, US-070

---

#### US-074: Push notification — trip ending soon
**Description:** As an owner, I want to be reminded 24 hours before my trip ends so I can prepare for my return.

**Acceptance Criteria:**
- [ ] Push notification: "Your trip ends tomorrow. Vault access will expire automatically."
- [ ] Sent 24 hours before trip endDate
- [ ] Scheduled via Convex cron or scheduled function

**Dependencies:** US-045, US-070

---

#### US-075: Notification preferences
**Description:** As an owner, I want to configure which notifications I receive so I'm not overwhelmed.

**Acceptance Criteria:**
- [ ] Settings page with notification toggles:
  - Task completions: All / Proof-only / Digest / Off
  - Vault access: Always on (non-configurable)
  - Link opened: On / Off
  - Trip ending: On / Off
- [ ] Default: proof-only for tasks, all others on
- [ ] Saved to user settings in Convex

**Dependencies:** US-024, US-070

---

### Epic 11: Trip Report

Post-trip summary with task completion, proof photos, and vault access log.

---

#### US-076: Trip report data aggregation
**Description:** As a developer, I need a query that aggregates all trip data into a report structure.

**Acceptance Criteria:**
- [ ] Query accepts tripId, returns: trip dates, sitter names, all tasks with completion status, proof photos, vault access log, activity timeline
- [ ] Tasks marked: done (with timestamp), not done, or skipped
- [ ] Report available after trip status is "expired" or "completed"
- [ ] Also available during active trip (live progress view)

**Dependencies:** US-040, US-068

---

#### US-077: Trip report in-app view
**Description:** As an owner, I want to view a scrollable trip report so I can review everything that happened.

**Acceptance Criteria:**
- [ ] Trip report page accessible from trip detail or dashboard (completed trips)
- [ ] Sections: summary (dates, sitter), task completion list (done/not done with timestamps), proof photos (gallery), vault access log, full activity timeline
- [ ] Proof photos tappable to full-size
- [ ] Color-coded completion: green (done), red (not done)
- [ ] Visual matches design system card styles

**Dependencies:** US-076, US-018

---

#### US-078: Trip report PDF export
**Description:** As an owner, I want to download the trip report as a PDF so I can share it with co-owners or keep for records.

**Acceptance Criteria:**
- [ ] "Download PDF" button on trip report page
- [ ] PDF includes: all report sections, proof photos (embedded), timestamps
- [ ] PDF styled cleanly (doesn't need to match app design exactly, but branded with Vadem logo)
- [ ] Reasonable file size (compressed images)

**Dependencies:** US-077

---

#### US-079: Trip report shareable link
**Description:** As an owner, I want to share the trip report via a link so co-owners or insurance can view it.

**Acceptance Criteria:**
- [ ] "Share Report" button generates a unique read-only link
- [ ] Link shows the report without requiring login
- [ ] Link can be revoked by owner
- [ ] Report link is separate from the trip Vadem link

**Dependencies:** US-077

---

### Epic 12: Offline & PWA

Service worker caching, offline task completion, and sync.

---

#### US-080: Service worker caching for instructions and photos
**Description:** As a sitter, I want the Vadem to work offline after my first visit so I can access instructions without cell service.

**Acceptance Criteria:**
- [ ] Service worker caches: app shell, all instruction text, pet profiles, location card photos, emergency contacts
- [ ] After first load, all cached content available offline
- [ ] Video files: cache on explicit play (not pre-cached due to size)
- [ ] Cache invalidated when owner updates the manual (version check on reconnect)

**Dependencies:** US-019, US-025

---

#### US-081: Offline task check-off with sync
**Description:** As a sitter, I want to check off tasks while offline and have them sync when I'm back online.

**Acceptance Criteria:**
- [ ] Task check-offs stored in IndexedDB or local storage when offline
- [ ] Visual indicator: "offline — will sync when connected" subtle badge
- [ ] On reconnect: queued completions sent to Convex with original timestamps
- [ ] No duplicate completions on sync
- [ ] Owner sees accurate timestamps (when task was actually checked, not when synced)

**Dependencies:** US-060, US-019

---

#### US-082: Offline photo proof queue
**Description:** As a sitter, I want to upload proof photos while offline and have them sync later.

**Acceptance Criteria:**
- [ ] Photos stored locally when offline (IndexedDB blob storage)
- [ ] Upload queue indicator: "2 photos waiting to upload"
- [ ] On reconnect: photos uploaded in order with original timestamps
- [ ] Failed uploads retry automatically (3 attempts with backoff)
- [ ] Queue persists across app closes/reopens

**Dependencies:** US-061, US-019

---

#### US-083: Vault stays online-only
**Description:** As a system, vault items must never be cached offline so credentials aren't stored on the device.

**Acceptance Criteria:**
- [ ] Vault API responses include `Cache-Control: no-store`
- [ ] Service worker explicitly excludes vault endpoints from caching
- [ ] Vault tab shows "Connect to the internet to access secure items" when offline
- [ ] No vault data in IndexedDB, local storage, or service worker cache

**Dependencies:** US-019, US-048

---

### Epic 13: Sitter-to-Creator Conversion

The viral loop — sitters become creators.

---

#### US-084: Sitter-to-creator prompt
**Description:** As a sitter who has used Vadem, I want to be gently prompted to create my own so the product grows virally.

**Acceptance Criteria:**
- [ ] After trip ends, sitter view shows: "Loved using Vadem? Create one for your own home." with CTA button
- [ ] CTA leads to signup page with context ("You were [Owner]'s sitter — now make your own")
- [ ] Also shown as a subtle banner in the manual view during active trips (non-intrusive)
- [ ] Never gates any sitter functionality behind signup
- [ ] Tracks conversion: sitter link → creator signup attribution

**Dependencies:** US-021, US-067

---

## Story Dependency Map

```
Epic 1 (Foundation)
  US-001 → US-002 → US-025, US-030, US-040, US-048, US-057, US-068
  US-001 → US-003 → US-004 through US-018 (all components)
  US-001 → US-019 → US-080 through US-083
  US-001 → US-020

Epic 2 (Auth)          depends on → Epic 1
Epic 3 (Manual/Wizard) depends on → Epic 1, Epic 2
Epic 4 (Location Cards) depends on → Epic 1
Epic 5 (Trip/Today)    depends on → Epic 1, Epic 3
Epic 6 (Vault)         depends on → Epic 1, Epic 5 (sitters)
Epic 7 (Contacts)      depends on → Epic 1
Epic 8 (Tasks/Proof)   depends on → Epic 1, Epic 5
Epic 9 (Sharing)       depends on → Epic 5
Epic 10 (Notifications) depends on → Epic 1, Epic 8, Epic 6
Epic 11 (Trip Report)  depends on → Epic 8, Epic 10
Epic 12 (Offline/PWA)  depends on → Epic 1, Epic 8
Epic 13 (Conversion)   depends on → Epic 2, Epic 9
```

### Suggested Build Order

| Phase | Epics | Weeks | Milestone |
|---|---|---|---|
| **Phase A** | Epic 1 (Foundation) | Weeks 1-2 | All components built, Convex connected, PWA shell |
| **Phase B** | Epic 2 (Auth) + Epic 7 (Contacts) + Epic 4 (Location Cards) | Weeks 3-4 | Creator can sign up, add contacts, upload location card photos |
| **Phase C** | Epic 3 (Manual/Wizard) | Weeks 4-6 | Creator can build a complete manual with wizard |
| **Phase D** | Epic 5 (Trip/Today) + Epic 9 (Sharing) | Weeks 6-8 | Sitter can open link and see Today View with tasks |
| **Phase E** | Epic 6 (Vault) + Epic 8 (Tasks/Proof) | Weeks 7-9 | Vault works, task check-off with proof works |
| **Phase F** | Epic 10 (Notifications) + Epic 11 (Trip Report) | Weeks 9-10 | Owner gets notifications, trip reports exportable |
| **Phase G** | Epic 12 (Offline) + Epic 13 (Conversion) | Weeks 10-12 | Offline works, viral loop in place |

**Total: 84 user stories across 13 epics.**

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **Creators won't finish setup** (too much work) | Guided wizard with progress indicator. Allow partial saves. "Finish later" at every step. Templates pre-fill common sections. |
| **Sitters won't engage** ("guests don't read") | Today view surfaces only what's relevant NOW. Location cards make it visual, not text-heavy. Test sitter engagement in concierge MVP. |
| **Consumer WTP is zero** (texts are free) | Free at launch to validate engagement first. Monetize based on data. Run landing page WTP tests in parallel. |
| **Photo proof feels intrusive** | Owner controls it per-task. Default is OFF. Recommend 1-3 proof items max. Test with friends-as-sitters vs. paid sitters. |
| **SMS PIN adds friction to vault** | PIN is only for vault (not general instructions). Pre-fill sitter info. One verification per session, not per item. |
| **CareSheet captures the niche first** | Speed to MVP matters. CareSheet is very early stage (Feb 2026). Vadem's location cards + today view + vault are broader than CareSheet's feature set. |
| **Offline sync complexity** | Queue actions locally, sync on reconnect. Vault stays online-only (security requirement). Limit video to 30s clips to manage cache size. |
| **Push notification fatigue** | Owner configures notification preferences: all events / proof-only / daily digest. Default to proof + vault access only. |

---

## 12. Future Phases (Not v1)

### Phase 2: Power User + Early STR

- Multi-property support
- Dual-audience views (sitter, cleaner, guest, emergency)
- Multi-language auto-translation
- Smart lock integration (time-bound digital keys)
- Cleaner scheduling / recurring task assignment
- PMS integrations (Hospitable, Guesty, Hostaway)
- AI-assisted content generation ("describe your pet and we'll structure the profile")
- Native iOS / Android apps

### Phase 3: Business / B2B

- Custom branding / white-label
- Team management (multiple staff members with roles)
- Upsell marketplace (local services, recommendations)
- API for partner integrations (Rover, Wag, TrustedHousesitters)
- Pricing: $8-$12/property/month (positioned between Touch Stay and Breezeway)

---

## 13. Open Questions

1. **Video hosting costs**: 30-second video clips per location card could add up. Need to estimate storage costs at scale and decide on compression/resolution limits.
2. **SMS costs**: Phone PIN verification has per-message costs (Twilio ~$0.0079/SMS). At scale with free pricing, this needs monitoring. Consider rate limiting.
3. **Sitter issue reporting**: Should the sitter have a "report a problem" button (pipe burst, pet is sick, something broke) that notifies the owner with urgency? Likely yes but UX needs design.
4. **Manual templates**: Should we ship with 2-3 pre-built templates (Dog + House, Cat + House, Multi-Pet + House + Plants) or let the wizard be the only onboarding path?
5. **Co-owner / partner access**: Should a second person (spouse, partner) be able to edit the manual? If so, what's the auth model for co-creators?
6. **Analytics for creators**: Beyond the activity feed, do creators want stats like "your sitter accessed the manual 12 times" or "most-viewed section: feeding instructions"?
7. **Notification channel**: Web push has low opt-in rates on iOS Safari. Should we also support SMS notifications to the owner as a fallback?

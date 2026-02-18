# Handoff — Design System

**Aesthetic**: Warm Editorial
**Philosophy**: The warmth of a handwritten care note meets the precision of a beautifully designed cookbook.

---

## Design Principles

- **Warm, not clinical.** Earthy tones, soft textures, generous radius.
- **Clear, not clever.** Information hierarchy over decoration.
- **Personal, not corporate.** Handwritten accents, pet photos as heroes.
- **Calm, not urgent.** Gentle animations, no red alerts for routine tasks.

### Signature Element: The Location Card

Polaroid-inspired photo cards with handwritten captions, slightly tilted, with a warm shadow. The answer to every "where is it?" question — and the thing users will remember and share. This IS the product's visual identity.

---

## Typography

Three fonts, three jobs.

| Role | Font | Usage |
|---|---|---|
| **Display** | Instrument Serif | Headings, hero text, the "Handoff" wordmark. Warm, editorial, with beautiful italics. |
| **Body / UI** | Bricolage Grotesque | Body text, buttons, inputs, labels, captions. Clean, friendly, geometric with personality. |
| **Handwritten** | Caveat | Location card captions, personality notes, personal annotations. Adds the "care note" warmth. |

### Type Scale

| Token | Size | Usage |
|---|---|---|
| `--text-6xl` | 60px | Brand wordmark only |
| `--text-5xl` | 48px | Page hero headings (Today View greeting) |
| `--text-4xl` | 36px | Section page titles |
| `--text-3xl` | 30px | Card group headings, manual section titles |
| `--text-2xl` | 24px | Section headings (Bricolage, semibold) |
| `--text-xl` | 20px | Card titles, subsection headings |
| `--text-lg` | 18px | Body large, vault code display |
| `--text-base` | 16px | Body default, input text |
| `--text-sm` | 14px | UI labels, task text, meta text, buttons |
| `--text-xs` | 12px | Captions, timestamps, badges, hints |

### Line Height

| Token | Value | Usage |
|---|---|---|
| `--leading-tight` | 1.2 | Display headings |
| `--leading-snug` | 1.35 | Card titles, handwritten text |
| `--leading-normal` | 1.5 | Body text default |
| `--leading-relaxed` | 1.65 | Long-form instructions, descriptions |

### Letter Spacing

| Token | Value | Usage |
|---|---|---|
| `--tracking-tight` | -0.02em | Display headings |
| `--tracking-normal` | 0 | Body text |
| `--tracking-wide` | 0.02em | Uppercase labels |

### Font Loading

```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,200..800&family=Caveat:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## Color Palette

Earthy, warm, and grounded. No tech-blue, no AI-purple. Colors that feel like home.

### Core Colors

| Name | Token | Hex | Usage |
|---|---|---|---|
| **Terracotta** | `--primary` | `#C2704A` | Primary actions, active states, brand accent |
| Terracotta Hover | `--primary-hover` | `#A85C38` | Hover/pressed state |
| Terracotta Active | `--primary-active` | `#934F30` | Active/pressed state |
| Terracotta Light | `--primary-light` | `#F5E6DD` | Soft backgrounds, time badges |
| Terracotta Subtle | `--primary-subtle` | `#FAF0EA` | Focus rings, very light wash |
| **Sage** | `--secondary` | `#5E8B6A` | Success, completed states, confirmations |
| Sage Hover | `--secondary-hover` | `#4D7558` | Hover state |
| Sage Light | `--secondary-light` | `#E4EDE7` | Completed task backgrounds |
| Sage Subtle | `--secondary-subtle` | `#F2F7F3` | Very light success wash |
| **Amber** | `--accent` | `#D4943A` | Highlights, trip overlay badges, warnings |
| Amber Hover | `--accent-hover` | `#BB7F2E` | Hover state |
| Amber Light | `--accent-light` | `#FBF0DD` | Overlay badge background |
| Amber Subtle | `--accent-subtle` | `#FDF8F0` | Personality note backgrounds |
| **Slate** | `--vault` | `#3D4F5F` | Vault/security elements, trust signaling |
| Slate Hover | `--vault-hover` | `#2F3F4D` | Hover state |
| Slate Light | `--vault-light` | `#E8ECF0` | Vault item backgrounds |
| Slate Subtle | `--vault-subtle` | `#F2F4F6` | Very light vault wash |

### Background Colors

| Name | Token | Hex | Usage |
|---|---|---|---|
| Linen | `--bg` | `#FAF6F1` | Page background (with subtle noise texture) |
| White | `--bg-raised` | `#FFFFFF` | Cards, modals, elevated surfaces |
| Sand | `--bg-sunken` | `#F3EDE5` | Recessed areas, search bar default |
| Warm Wash | `--bg-warm-wash` | `#FDF8F3` | Section backgrounds |

### Text Colors

| Name | Token | Hex | Usage |
|---|---|---|---|
| Ink | `--text` | `#2A1F1A` | Primary text (warm dark brown, not black) |
| Secondary | `--text-secondary` | `#6B5A50` | Descriptions, body text |
| Muted | `--text-muted` | `#A89890` | Placeholders, timestamps, hints |
| On Primary | `--text-on-primary` | `#FFFFFF` | Text on terracotta/sage/slate buttons |

### Border Colors

| Name | Token | Hex | Usage |
|---|---|---|---|
| Default | `--border` | `#E8DFD6` | Card borders, dividers |
| Strong | `--border-strong` | `#D4C8BC` | Hover borders, emphasis |
| Focus | `--border-focus` | `var(--primary)` | Input focus state |

### Semantic Colors

| Name | Token | Hex | Usage |
|---|---|---|---|
| Success | `--success` | `#5E8B6A` | Completed tasks, confirmations (= Sage) |
| Success Light | `--success-light` | `#E4EDE7` | Success badge background |
| Warning | `--warning` | `#D4943A` | Due today, expiring soon (= Amber) |
| Warning Light | `--warning-light` | `#FBF0DD` | Warning badge background |
| Danger | `--danger` | `#C45050` | Revoke, delete, urgent errors |
| Danger Light | `--danger-light` | `#FAEAEA` | Danger badge background |

### Special

| Name | Token | Hex | Usage |
|---|---|---|---|
| Overlay Badge | `--overlay-badge` | `#EAB440` | Trip overlay golden badge |
| Overlay Badge Text | `--overlay-badge-text` | `#5C4310` | Text on overlay badge |

---

## Spacing

4px base scale. Use `--space-` tokens consistently.

| Token | Value | Common Usage |
|---|---|---|
| `--space-1` | 4px | Tight gaps, badge padding vertical |
| `--space-2` | 8px | Icon gaps, inline spacing, badge padding horizontal |
| `--space-3` | 12px | Button padding vertical, input padding, small card gaps |
| `--space-4` | 16px | Default card padding, list gaps, section content |
| `--space-5` | 20px | Card body padding, medium gaps |
| `--space-6` | 24px | Section gaps, card group spacing |
| `--space-8` | 32px | Large section padding, page margins |
| `--space-10` | 40px | Subsection spacing |
| `--space-12` | 48px | Section breaks |
| `--space-16` | 64px | Major section dividers |
| `--space-20` | 80px | Page section spacing |
| `--space-24` | 96px | Hero spacing |

---

## Border Radius

Generous but not bubbly. Rounded enough to feel warm, structured enough to feel trustworthy.

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Checkboxes, small badges, code blocks |
| `--radius-md` | 10px | Buttons, inputs, location card images |
| `--radius-lg` | 14px | Cards, task items, vault items, toasts |
| `--radius-xl` | 20px | Pet profile cards, today view container |
| `--radius-2xl` | 28px | Today header bottom corners, modals |
| `--radius-pill` | 9999px | Badges, pills, section nav items |
| `--radius-round` | 50% | Avatars, emergency contact icons, wizard dots |

---

## Shadows

Warm-tinted using `rgba(42, 31, 26)` instead of neutral gray. Gives depth without coldness.

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px rgba(42,31,26,0.04)` | Subtle elevation, buttons at rest |
| `--shadow-sm` | `0 1px 4px rgba(42,31,26,0.06), 0 1px 2px rgba(42,31,26,0.04)` | Cards at rest, inputs |
| `--shadow-md` | `0 4px 12px rgba(42,31,26,0.07), 0 2px 4px rgba(42,31,26,0.04)` | Cards on hover, dropdowns |
| `--shadow-lg` | `0 12px 32px rgba(42,31,26,0.1), 0 4px 8px rgba(42,31,26,0.04)` | Modals, notification toasts |
| `--shadow-xl` | `0 20px 48px rgba(42,31,26,0.14), 0 8px 16px rgba(42,31,26,0.05)` | Today view container, hero elements |
| `--shadow-polaroid` | `2px 4px 16px rgba(42,31,26,0.13), 0 1px 3px rgba(42,31,26,0.08)` | Location cards (signature shadow) |
| `--shadow-inner` | `inset 0 1px 3px rgba(42,31,26,0.06)` | Pressed states, sunken inputs |

---

## Motion & Animation

Gentle, reassuring, never flashy. The check-off animation is the most satisfying moment in the app.

### Easing Curves

| Token | Value | Usage |
|---|---|---|
| `--ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Cards, modals, page transitions. Decelerating, natural. |
| `--ease-spring` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Checkboxes, toggles, buttons. Slight overshoot, playful. |

### Durations

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | 150ms | Hover states, button presses, color changes |
| `--duration-normal` | 250ms | Card transitions, border changes, focus rings |
| `--duration-slow` | 400ms | Modal entrance, section reveals |
| `--duration-reveal` | 600ms | Page load staggers, today view task list entrance |

### Animation Patterns

| Pattern | Trigger | Implementation |
|---|---|---|
| **Fade Up** | Page load, section entrance | `translateY(20px)` → `translateY(0)` + opacity, staggered with `animation-delay` |
| **Check Pop** | Task check-off | `scale(1)` → `scale(1.2)` → `scale(1)` with spring easing. Checkbox fills sage green. |
| **Card Lift** | Hover on cards/location cards | `translateY(-2px to -4px)` + shadow elevation increase |
| **Location Card Tilt** | Hover on location cards | Additional slight rotation change (e.g., `-1.5deg` → `-2.5deg`) |
| **Toast Slide** | Notification appears | `translateX(20px) scale(0.96)` → `translateX(0) scale(1)` with spring easing |
| **Stagger Reveal** | Today view tasks load | Each task delayed by 50-80ms, fading up sequentially |

### Rules

- Prefer CSS transitions for hover/focus states
- Use CSS `@keyframes` for entrance animations
- Use `animation-delay` for staggered list reveals
- Vault reveal should feel deliberate — slightly slower (400ms) to signal security
- Never animate the vault code value itself — it should appear instantly after verification
- Task check-off is the ONE animation that should feel delightful — invest in the spring bounce

---

## Components

### Buttons

| Variant | Background | Text | Usage |
|---|---|---|---|
| **Primary** | `--primary` (Terracotta) | White | Main actions: Share Handoff, Create Trip, Save |
| **Secondary** | `--secondary` (Sage) | White | Confirmations: Mark Complete, Confirm |
| **Vault** | `--vault` (Slate) | White | Security actions: Unlock Vault, Verify Phone |
| **Ghost** | Transparent + border | `--text-secondary` | Cancel, secondary actions, back |
| **Soft** | `--primary-light` | `--primary` | Tertiary actions: Add Photo, Edit |
| **Danger** | `--danger` | White | Destructive: Revoke Access, Delete |

**Sizes:**
- **Large**: `text-base`, `padding: 16px 32px`, `radius-lg` — hero CTAs, wizard primary actions
- **Default**: `text-sm`, `padding: 12px 20px`, `radius-md` — standard actions
- **Small**: `text-xs`, `padding: 8px 12px`, `radius-sm` — inline actions, vault verify

**Behavior:**
- Hover: `translateY(-1px)` + elevated shadow + darker background
- Active: inner overlay `rgba(0,0,0,0.06)`
- Primary button casts a colored shadow matching its background

### Inputs

- Border: `1.5px solid --border`
- Focus: border changes to `--primary`, `box-shadow: 0 0 0 3px --primary-subtle`
- Error: border `--danger`, focus shadow `--danger-light`
- Placeholder text: `--text-muted`
- Textarea: `min-height: 100px`, vertical resize only

**Search Bar:**
- Icon (magnifying glass) positioned inside left padding
- Default background: `--bg-sunken` with transparent border
- On focus: background switches to `--bg-raised`, border appears in `--primary`

### Badges & Pills

| Variant | Background | Text | Border | Usage |
|---|---|---|---|---|
| **Overlay** | `--accent-light` | `--overlay-badge-text` | `rgba(234,180,64,0.3)` | "This Trip Only" on overlay tasks |
| **Room** | `--bg-sunken` | `--text-secondary` | `--border` | Room/area tags: Kitchen, Garage, Backyard |
| **Vault** | `--vault-light` | `--vault` | `rgba(61,79,95,0.15)` | "Secure" indicator on vault-gated items |
| **Success** | `--success-light` | `--success` | none | Completed, active status |
| **Warning** | `--warning-light` | `#8B6420` | none | Due today, expiring |
| **Danger** | `--danger-light` | `--danger` | none | Urgent, overdue |
| **Time** | `--primary-light` | `--primary` | none | Time slots: "7:00 AM", "6:00 PM" |

All badges: `font-size: 12px`, `font-weight: 600`, `padding: 3px 10px`, `border-radius: pill`.
Overlay badge prefixed with `✦`. Vault badge prefixed with `🔒`.

### Location Card (Signature Component)

The product's visual identity. Styled like an instant photo.

**Structure:**
```
┌─────────────────────────┐
│  ┌───────────────────┐  │  ← 8px padding around image
│  │                   │  │
│  │   Photo / Video   │  │  ← aspect-ratio: 4/3, radius-md, object-fit: cover
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  Handwritten caption    │  ← Caveat font, text-xl, --text color
│  in Caveat font         │
│                         │
│  [Kitchen]              │  ← Room badge
└─────────────────────────┘
```

**Visual treatment:**
- `border-radius: --radius-lg` (14px)
- `box-shadow: --shadow-polaroid`
- Slight rotation: `-1.5deg`, `0deg`, or `+1.2deg` for variety in groups
- Hover: `translateY(-4px)` + rotation shift + `--shadow-xl`
- Subtle `1px` inner border at `rgba(42,31,26,0.06)` for photo edge definition
- Width: `280px` default (responsive in context)

**Accessibility:** Alt text on photos describing the location. Caption is visible text, not just decoration.

### Pet Profile Card

The emotional core. Pet photo is the hero.

**Structure:**
```
┌─────────────────────────┐
│                         │
│     Pet Photo (1:1)     │  ← Square aspect ratio, full bleed
│                         │
├─────────────────────────┤
│  Luna                   │  ← Instrument Serif, text-3xl
│  Golden Retriever · 4yr │  ← text-sm, --text-muted
│─────────────────────────│
│  🍽 Feeding: ...        │  ← Detail rows with emoji icons
│  💊 Medications: ...    │
│  🚶 Walking: ...        │
│  🩺 Vet: Dr. Martinez   │  ← Tap-to-call styled in sage
│─────────────────────────│
│  "She's shy with        │  ← Caveat font, accent-subtle bg
│   strangers..."         │     Personality note
└─────────────────────────┘
```

**Visual treatment:**
- `border-radius: --radius-xl` (20px)
- `box-shadow: --shadow-md`, hover: `--shadow-lg` + `translateY(-2px)`
- Photo placeholder: gradient from `--primary-light` to `--accent-light`
- Detail rows separated by `1px --border` top border
- Personality note: `--accent-subtle` background, `--radius-md`, Caveat font
- Max width: `360px`

### Task Item

The core interactive element in the Today View.

**Structure:**
```
┌──┬─────────────────────────────────┬──────────┐
│  │  Task instruction text           │  📷 Proof │
│☐ │  [7:00 AM] [Kitchen]            │          │
└──┴─────────────────────────────────┴──────────┘
```

**States:**
- **Default**: White background, `--border`, hover adds `--shadow-sm`
- **Completed**: `--secondary-subtle` background, `--secondary-light` border, text strikethrough in `--text-muted`
- **Trip Overlay**: `3px` left border in `--accent`, overlay badge in meta row

**Checkbox:**
- `26px × 26px`, `radius-sm`, `2px --border-strong` border
- Hover: border changes to `--secondary`
- Checked: fills `--secondary`, white checkmark SVG, spring bounce animation (`checkPop`)
- Animation: `scale(1)` → `scale(1.2)` → `scale(1)` over 350ms with spring easing

**Proof Button:**
- Dashed border, `--text-muted` text
- Hover: border and text change to `--primary`, background `--primary-subtle`
- Icon: camera emoji

### Vault Item

Secure credential display with trust-coded visuals.

**Structure:**
```
┌────┬──────────────────────────┬──────────┐
│ 🔒 │  Front Door Code          │  4 8 2 7 │
│    │  Enter on keypad, press # │          │
└────┴──────────────────────────┴──────────┘
```

**States:**
- **Revealed**: `--secondary-subtle` background, `--secondary-light` border. Code visible in monospace, `--vault` color, letter-spacing `0.15em`.
- **Default (verified)**: `--vault-subtle` background, `--vault-light` border. Code visible.
- **Locked (unverified)**: Code blurred with `filter: blur(8px)`. Verify button shown instead of code value.

**Icon:** `44px × 44px`, `--radius-md`, `--vault` background, white icon.

**Important design rule:** For unregistered viewers, vault items are **fully hidden**, not blurred. They see a message: "Sarah shared secure info with you — verify your phone number to view." The blurred state is only for teasing verified users who haven't tapped to reveal yet.

### Emergency Contact Bar

Horizontally scrollable contact chips, always accessible.

**Structure per contact:**
```
┌──────┬────────────┬────────┐
│  👤  │  John      │ 📞 Call │
│      │  Owner     │        │
└──────┴────────────┴────────┘
```

- Icon: `36px` round circle, color-coded by role:
  - Owner: `--primary-light`
  - Vet: `--secondary-light`
  - Neighbor: `--accent-light`
  - Emergency: `--danger-light`
- Hover: border `--secondary`, background `--secondary-subtle`
- "Call" text in `--secondary`, `font-weight: 600`
- Always `min-width: max-content`, `white-space: nowrap`

### Today View Header

The sitter's first impression. Warm, contextual, reassuring.

- Background: gradient from `--primary` to `--primary-hover` (135deg)
- Decorative circle: `rgba(255,255,255,0.06)`, positioned top-right, `300px` diameter
- Bottom radius: `--radius-2xl` (28px)
- Greeting: Instrument Serif, `text-3xl`, white
- Date: `text-sm`, `opacity: 0.8`
- Stats: `rgba(255,255,255,0.15)` background with `backdrop-filter: blur(8px)`, `--radius-md`

### Time Slot Dividers

Separate morning/afternoon/evening task groups.

- Icon: `32px` round circle with time-of-day emoji
  - Morning: ☀️ on `--accent-light`
  - Afternoon: ⛅ on `--primary-light`
  - Evening: 🌙 on `--vault-light`
- Label: `text-sm`, `font-weight: 700`, uppercase, `letter-spacing: 0.05em`
- Line: `1px --border`, flex-grows to fill remaining width

### Wizard Progress

6-step guided setup flow.

- **Completed step**: Sage dot with white checkmark, sage label
- **Active step**: Terracotta dot with white number, terracotta label, colored shadow
- **Upcoming step**: `--border` outlined dot, `--text-muted` number and label
- Connectors: `2px` lines, `40px` wide, sage when connecting completed steps, `--border` otherwise
- Dots: `32px × 32px`, round

### Section Navigation

Horizontal scrollable pills for the full manual.

- Each item: emoji + text, `--radius-pill`, `--border`, `text-sm`, `font-weight: 500`
- Active: `--primary` background, white text
- Hover: `--bg-sunken` background
- Scrollable container with `-webkit-overflow-scrolling: touch`

### Notification Toasts

Owner-facing event notifications.

- Max width: `380px`
- `--radius-lg`, `--shadow-lg`
- Left border `3px` color-codes the event type:
  - Success (task completed): `--success`
  - Vault access: `--vault`
  - Warning (trip expiring): `--warning`
- Entrance animation: slide from right with spring easing, `0.5s`
- Contains: icon, title (`text-sm`, bold), message (`text-xs`), timestamp (`text-xs`, muted)

### Activity Feed

Chronological log in the owner's dashboard.

- Color-coded dots (`8px` round) by event type:
  - View (link opened): `--primary` (Terracotta)
  - Task completed: `--secondary` (Sage)
  - Vault accessed: `--vault` (Slate)
  - Proof uploaded: `--accent` (Amber)
- Text: `text-sm`, `--text-secondary`, with bold `--text` for names
- Timestamp: `text-xs`, `--text-muted`
- Items separated by `1px --border` bottom border

### Bottom Navigation (Mobile)

4-tab navigation for the sitter view.

- Today (compass icon) | Manual (book icon) | Vault (lock icon) | Contacts (phone icon)
- Active tab: `--primary` color
- Inactive: `--text-muted`
- Label: `text-xs`, `font-weight: 500`
- Container: `--radius-xl` top corners, `--shadow` upward, `--border` top

---

## Background Treatment

The page background is not a flat color. It uses `--bg` (#FAF6F1) with a subtle SVG noise texture overlay at very low opacity (2.5%) to create a paper-like warmth. This is implemented as an inline SVG data URI in the body background-image.

---

## Accessibility Notes

- All text meets WCAG AA contrast ratios against its background
- `--text` (#2A1F1A) on `--bg` (#FAF6F1) = 12.5:1 contrast ratio
- `--text-on-primary` (white) on `--primary` (#C2704A) = 4.6:1 (passes AA for large text; use bold weight for small text)
- Interactive elements have visible focus states (terracotta ring)
- Location card photos must have descriptive alt text
- Tap targets minimum 44px for mobile (emergency contacts, checkboxes)
- Vault items use `aria-hidden` when locked, clear messaging when restricted
- Check-off animation respects `prefers-reduced-motion`

---

## CSS Custom Properties (Full Reference)

```css
:root {
  /* Colors */
  --bg:              #FAF6F1;
  --bg-raised:       #FFFFFF;
  --bg-sunken:       #F3EDE5;
  --bg-warm-wash:    #FDF8F3;
  --primary:         #C2704A;
  --primary-hover:   #A85C38;
  --primary-active:  #934F30;
  --primary-light:   #F5E6DD;
  --primary-subtle:  #FAF0EA;
  --secondary:       #5E8B6A;
  --secondary-hover: #4D7558;
  --secondary-light: #E4EDE7;
  --secondary-subtle:#F2F7F3;
  --accent:          #D4943A;
  --accent-hover:    #BB7F2E;
  --accent-light:    #FBF0DD;
  --accent-subtle:   #FDF8F0;
  --vault:           #3D4F5F;
  --vault-hover:     #2F3F4D;
  --vault-light:     #E8ECF0;
  --vault-subtle:    #F2F4F6;
  --text:            #2A1F1A;
  --text-secondary:  #6B5A50;
  --text-muted:      #A89890;
  --text-on-primary: #FFFFFF;
  --text-on-vault:   #FFFFFF;
  --border:          #E8DFD6;
  --border-strong:   #D4C8BC;
  --border-focus:    var(--primary);
  --success:         #5E8B6A;
  --success-light:   #E4EDE7;
  --warning:         #D4943A;
  --warning-light:   #FBF0DD;
  --danger:          #C45050;
  --danger-light:    #FAEAEA;
  --overlay-badge:   #EAB440;
  --overlay-badge-text: #5C4310;

  /* Typography */
  --font-display:    'Instrument Serif', Georgia, serif;
  --font-body:       'Bricolage Grotesque', system-ui, sans-serif;
  --font-handwritten:'Caveat', cursive;
  --text-xs:   0.75rem;
  --text-sm:   0.875rem;
  --text-base: 1rem;
  --text-lg:   1.125rem;
  --text-xl:   1.25rem;
  --text-2xl:  1.5rem;
  --text-3xl:  1.875rem;
  --text-4xl:  2.25rem;
  --text-5xl:  3rem;
  --text-6xl:  3.75rem;
  --leading-tight:   1.2;
  --leading-snug:    1.35;
  --leading-normal:  1.5;
  --leading-relaxed: 1.65;
  --tracking-tight:  -0.02em;
  --tracking-normal: 0;
  --tracking-wide:   0.02em;

  /* Spacing */
  --space-1:  0.25rem;
  --space-2:  0.5rem;
  --space-3:  0.75rem;
  --space-4:  1rem;
  --space-5:  1.25rem;
  --space-6:  1.5rem;
  --space-8:  2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;

  /* Radius */
  --radius-sm:    6px;
  --radius-md:    10px;
  --radius-lg:    14px;
  --radius-xl:    20px;
  --radius-2xl:   28px;
  --radius-pill:  9999px;
  --radius-round: 50%;

  /* Shadows */
  --shadow-xs:  0 1px 2px rgba(42,31,26,0.04);
  --shadow-sm:  0 1px 4px rgba(42,31,26,0.06), 0 1px 2px rgba(42,31,26,0.04);
  --shadow-md:  0 4px 12px rgba(42,31,26,0.07), 0 2px 4px rgba(42,31,26,0.04);
  --shadow-lg:  0 12px 32px rgba(42,31,26,0.1), 0 4px 8px rgba(42,31,26,0.04);
  --shadow-xl:  0 20px 48px rgba(42,31,26,0.14), 0 8px 16px rgba(42,31,26,0.05);
  --shadow-polaroid: 2px 4px 16px rgba(42,31,26,0.13), 0 1px 3px rgba(42,31,26,0.08);
  --shadow-inner: inset 0 1px 3px rgba(42,31,26,0.06);

  /* Motion */
  --ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --duration-slow: 400ms;
  --duration-reveal: 600ms;
}
```

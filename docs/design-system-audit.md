# Design System Audit — Component vs Spec Alignment

**Audited against:** `docs/handoff-design-system.md` (spec), `docs/handoff-design-system.html` (reference implementation), `src/app/globals.css` (tokens)

**Status:** Read-only audit. No changes made.

---

## Systemic Issues (affect multiple components)

### 1. Border width: `border-[1.5px]` used where spec says `1px`

The design spec and HTML reference use `1px` borders on cards/containers. Only **inputs** specify `1.5px`.

**Affected components:**
- `TaskItem.tsx` outer border — should be `border` (1px)
- `VaultItem.tsx` — should be `border` (1px)
- `EmergencyContactBar.tsx` contact cards — should be `border` (1px)
- `SectionNav.tsx` pill borders — should be `border` (1px)
- `NotificationToast.tsx` — should be `border` (1px)

**Correctly using 1.5px:** Input.tsx, Textarea.tsx (spec says `1.5px solid`)

### 2. Border radius: `rounded-md` (10px) used where spec says `rounded-lg` (14px)

Several card-type components use `rounded-md` but the design system specifies `--radius-lg` (14px) for "cards, task items, vault items, toasts."

**Affected components:**
- `LocationCard.tsx:122` — `rounded-md` → `rounded-lg`
- `TaskItem.tsx:108` — `rounded-md` → `rounded-lg`
- `VaultItem.tsx:47` — `rounded-md` → `rounded-lg`

### 3. Missing hover state on inputs

Spec says inputs should darken border on hover: `hover { border-color: var(--border-strong) }`. Both Input.tsx and Textarea.tsx are missing `hover:border-border-strong`.

---

## globals.css Token Issues

### A. `checkPop` animation differs from spec
- **Spec:** `scale(1) → scale(1.2) → scale(1)` over **350ms**
- **globals.css:** `scale(1) → scale(1.25) → scale(0.9) → scale(1)` over **250ms**
- **Fix:** Change to `0% { scale(1) } 40% { scale(1.2) } 100% { scale(1) }` and duration to `350ms`

### B. Toast slide-in animation significantly different
- **Spec/HTML:** `translateX(20px) scale(0.96) → translateX(0) scale(1)` — subtle slide from right
- **globals.css:** `translateX(100%) → translateX(0)` — slides from entirely off-screen, no scale
- **Fix:** Change keyframes to match spec: `from { opacity: 0; transform: translateX(20px) scale(0.96); } to { opacity: 1; transform: translateX(0) scale(1); }`

---

## Per-Component Findings

### Button.tsx — Minor issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Missing `whitespace-nowrap` | not set | `.btn { white-space: nowrap }` | Low |
| 2 | Missing `leading-none` | default line-height | `line-height: 1` | Low |
| 3 | Soft hover goes lighter | `hover:bg-primary-subtle` (#FAF0EA) | `#EEDBD0` (darker on hover) | Medium |

### Input.tsx / Textarea.tsx — 2 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Missing hover border | none | `hover:border-border-strong` | Medium |
| 2 | Label-to-field gap too small | `gap-1` (4px) | `gap: var(--space-2)` (8px) → `gap-2` | Low |

### Badge.tsx — 3 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Missing gap for prefix icons | no gap | `gap: var(--space-1)` → `gap-1` | Low |
| 2 | Room badge weight | `font-semibold` (600) | `font-weight: 500` → needs `font-medium` | Low |
| 3 | Time badge weight | `font-semibold` (600) | `font-weight: 500` → needs `font-medium` | Low |
| 4 | Line height | `leading-none` (1) | `line-height: 1.4` | Low |

### LocationCard.tsx — 5 issues (HIGH PRIORITY)

The signature component has the most visual discrepancies from the reference.

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Card border-radius | `rounded-md` (10px) | `--radius-lg` (14px) → `rounded-lg` | **High** |
| 2 | No polaroid padding | image goes full-bleed | `padding: var(--space-2)` (8px) around image → `p-2` | **High** |
| 3 | Missing inner border | none | `1px solid rgba(42,31,26,0.06)` via `::before` | Medium |
| 4 | Caption area padding too large | `px-4 pb-4` | `px-2 pb-2` (tighter, polaroid-like) | Medium |
| 5 | Image border-radius | `rounded-t-md` (top only) | `rounded-md` (all corners, since image is inset) | Medium |

The polaroid look requires the image to be **inset** within the white card with 8px padding on all sides, and the image gets its own rounded corners. Currently the image bleeds to the card edges, losing the signature polaroid feel.

### PetProfileCard.tsx — 5 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Missing card border | none | `border: 1px solid var(--border)` → `border border-border-default` | **High** |
| 2 | Missing hover translate | shadow only | `translateY(-2px)` on hover | Medium |
| 3 | Detail rows: no separator borders | uses gap | `border-top: 1px solid var(--border)` + `py-3` per row | Medium |
| 4 | Detail label/value colors swapped | label=text-secondary, value=text-primary | label=text-primary+semibold, value=text-secondary | Medium |
| 5 | Transition missing translate | `transition-shadow` | needs `transition-[box-shadow,translate]` | Low |

### TaskItem.tsx — 7 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Border radius | `rounded-md` (10px) | `--radius-lg` (14px) → `rounded-lg` | Medium |
| 2 | Task text size | `text-base` (16px) | `text-sm` (14px) | Medium |
| 3 | Outer gap | `gap-3` (12px) | `gap: var(--space-4)` (16px) → `gap-4` | Low |
| 4 | Padding | `py-3 px-4` | `padding: var(--space-4) var(--space-5)` → `py-4 px-5` | Low |
| 5 | Border width | `border-[1.5px]` | `1px` → `border` | Low |
| 6 | Checkbox border | `border-[1.5px]` | `border: 2px solid` → `border-2` | Low |
| 7 | Completed border color | unchanged | `border-color: var(--secondary-light)` | Low |

### VaultItem.tsx — 6 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Border radius | `rounded-md` (10px) | `--radius-lg` (14px) → `rounded-lg` | Medium |
| 2 | Label font-size | `text-base` (16px) | `text-sm` (14px) | Medium |
| 3 | Hint: wrong size & color | `text-sm text-text-secondary` | `text-xs text-text-muted` | Medium |
| 4 | Padding | `px-4 py-3` | `py-4 px-5` | Low |
| 5 | Gap | `gap-3` (12px) | `gap: var(--space-4)` (16px) → `gap-4` | Low |
| 6 | Border width | `border-[1.5px]` | `1px` → `border` | Low |
| 7 | Value missing styled box | plain text | `bg-vault-light py-2 px-3 rounded-sm` around value | Medium |

### EmergencyContactBar.tsx — 2 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | "Call" link color | `text-primary` (terracotta) | `text-secondary` (sage) | **High** |
| 2 | Border width on cards | `border-[1.5px]` | `1px` → `border` | Low |

### TodayViewHeader.tsx — 5 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Decorative circle too small | `w-40 h-40` (160px) | `300px × 300px` | Medium |
| 2 | Stat chip border-radius | `rounded-pill` | `--radius-md` → `rounded-md` | Medium |
| 3 | Stats container gap | `gap-2` (8px) | `gap: var(--space-4)` (16px) → `gap-4` | Low |
| 4 | Horizontal padding | `px-5` (20px) | `px-6` (24px) | Low |
| 5 | Backdrop blur | `blur(12px)` | `blur(8px)` | Low |

### TimeSlotDivider.tsx — 4 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Label font-size | `text-xs` (12px) | `text-sm` (14px) | Medium |
| 2 | Label font-weight | `font-semibold` (600) | `font-bold` (700) | Low |
| 3 | Label letter-spacing | `tracking-wide` (0.02em) | `0.05em` → `tracking-[0.05em]` | Low |
| 4 | Label color | `text-text-muted` | `text-text-primary` (var(--text)) | Medium |

### WizardProgress.tsx — 1 issue

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Connector width | `w-8` (32px) | `40px` → `w-10` | Low |

### NotificationToast.tsx — 4 issues

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Left border width | `border-l-4` (4px) | `3px` → `border-l-[3px]` | Low |
| 2 | Message text size | `text-sm` (14px) | `text-xs` (12px) | Medium |
| 3 | Padding | `p-4` | `py-4 px-5` | Low |
| 4 | Border width | `border-[1.5px]` | `1px` → `border` | Low |

### BottomNav.tsx — 1 issue

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Missing top border | none | `border-top: 1px solid var(--border)` → `border-t border-border-default` | Medium |

### SectionNav.tsx — 1 issue

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Border width | `border-[1.5px]` | `1px` → `border` | Low |

### SearchBar.tsx — 1 issue

| # | Issue | Current | Spec | Severity |
|---|-------|---------|------|----------|
| 1 | Has `shadow-inner` at rest | `shadow-inner` | not in spec for search bar | Low |

### ActivityFeedItem.tsx — No issues

Matches the spec well. No changes needed.

---

## Priority Fix Order

### Wave 1 — High-impact visual fixes (signature components)
1. **LocationCard** polaroid padding, border-radius, image inset
2. **PetProfileCard** missing border, detail row separators, label/value color swap
3. **EmergencyContactBar** Call link color (sage not terracotta)
4. **globals.css** toast animation (translateX(20px) not 100%)

### Wave 2 — Systemic border/radius corrections
5. Fix `border-[1.5px]` → `border` across 5 components
6. Fix `rounded-md` → `rounded-lg` on TaskItem, VaultItem
7. Add `hover:border-border-strong` to Input/Textarea

### Wave 3 — Typography & spacing fine-tuning
8. TaskItem text size (`text-base` → `text-sm`)
9. VaultItem label/hint sizes and colors
10. TimeSlotDivider label (size, weight, color, spacing)
11. TodayViewHeader decorative circle size, stat chip radius
12. NotificationToast message size, left border width
13. Badge line-height and font-weight variants
14. globals.css checkPop duration (250ms → 350ms)

### Wave 4 — Minor polish
15. Button whitespace-nowrap, leading-none, soft hover color
16. Input/Textarea label gap (gap-1 → gap-2)
17. WizardProgress connector width
18. Various padding adjustments (TaskItem, VaultItem, TodayViewHeader, Toast)
19. BottomNav missing top border

---

## Summary

| Severity | Count |
|----------|-------|
| **High** | 5 issues across 4 components |
| **Medium** | ~20 issues across 10 components |
| **Low** | ~20 issues across 12 components |

**Components with no issues:** ActivityFeedItem

**Most issues:** LocationCard (5), TaskItem (7), VaultItem (7), PetProfileCard (5)

The biggest visual deviation is **LocationCard** — it's missing the signature polaroid look (inset image with padding) and has wrong border-radius. This is the product's visual identity per the spec, so it should be fixed first.

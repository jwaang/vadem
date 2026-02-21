# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev              # Next.js + Convex dev server (Turbopack)
pnpm dev:next         # Next.js only (no Convex)
pnpm build            # Production build
pnpm lint             # ESLint (next/core-web-vitals + typescript + prettier)
pnpm typecheck        # tsc --noEmit
pnpm format           # Prettier write
pnpm format:check     # Prettier check
```

No test runner is configured yet. Run `pnpm lint && pnpm typecheck` to validate changes.

## Architecture

**Vadem** is a PWA for homeowners to create care manuals for house/pet sitters. Mobile-first, warm editorial aesthetic.

### Stack
- **Next.js 16** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** via `@tailwindcss/postcss` — theme mapped to CSS custom properties in `globals.css`
- **Convex** for backend (real-time sync, auth) — schema not yet built out (`convex/schema.ts` is empty)
- **pnpm** package manager

### Layout
- `src/app/layout.tsx` — Root layout, registers 3 Google Fonts as CSS variables, wraps in `ConvexClientProvider`
- `src/app/globals.css` — **All design tokens** live here (colors, typography, spacing, shadows, motion). This is the source of truth for the design system.
- `src/app/page.tsx` — Component showcase page (living docs for all UI components)
- `src/components/ui/` — Reusable presentational components (Button, Input, Badge, TaskItem, PetProfileCard, etc.)
- `src/components/layouts/` — `CreatorLayout` (desktop sidebar + mobile bottom nav) and `SitterLayout` (full-width mobile-first)
- `convex/` — Backend functions and schema (mostly scaffolding currently)
- `docs/prd.md` — Full product requirements document
- `docs/vadem-design-system.md` — Design token specifications
- `docs/vadem-tasks/` — Epic/story breakdowns as JSON

### Path Alias
`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## Design System

**Reference docs:** `docs/vadem-design-system.md` (spec), `docs/vadem-design-system.html` (visual reference implementation)

### Fonts
Three fonts registered on `<html>` as CSS variables in `layout.tsx`:
- `--font-display` / `font-display` (Instrument Serif) — headings, hero text, the "Vadem" wordmark
- `--font-body` / `font-body` (Bricolage Grotesque) — body text, buttons, inputs, labels
- `--font-handwritten` / `font-handwritten` (Caveat) — location card captions, personality notes

### Colors
Tailwind theme colors defined via `@theme inline` in `globals.css`. Use Tailwind classes:
- **Primary** (terracotta `#C2704A`): `bg-primary`, `text-primary`, `border-primary` + `-hover`, `-active`, `-light`, `-subtle` variants
- **Secondary** (sage `#5E8B6A`): `bg-secondary`, `text-secondary` + variants — success, completed states
- **Accent** (amber `#D4943A`): `bg-accent`, `text-accent` + variants — highlights, trip overlays
- **Vault** (slate `#3D4F5F`): `bg-vault`, `text-vault` + variants — security elements
- **Backgrounds**: `bg-bg` (linen #FAF6F1), `bg-bg-raised` (white), `bg-bg-sunken` (sand), `bg-bg-warm-wash`
- **Text**: `text-text-primary` (ink #2A1F1A), `text-text-secondary`, `text-text-muted`, `text-text-on-primary` (white)
- **Borders**: `border-border-default`, `border-border-strong`, `border-border-focus`
- **Semantic**: `text-success`/`bg-success-light`, `text-warning`/`bg-warning-light`, `text-danger`/`bg-danger-light`

### Border Radius Scale
- `rounded-sm` (6px) — checkboxes, small badges
- `rounded-md` (10px) — buttons, inputs, images within cards
- `rounded-lg` (14px) — **cards, task items, vault items, toasts**
- `rounded-xl` (20px) — pet profile cards, today view container
- `rounded-2xl` (28px) — today header bottom corners, modals
- `rounded-pill` (9999px) — badges, pills, section nav items
- `rounded-round` (50%) — avatars, icons, wizard dots

### Shadows (warm-tinted `rgba(42,31,26,...)`)
`shadow-xs` → `shadow-sm` → `shadow-md` → `shadow-lg` → `shadow-xl` → `shadow-polaroid` (location cards)

### Motion
- `ease-out` — cards, modals, page transitions (decelerating)
- `ease-spring` — checkboxes, toggles, buttons (slight overshoot)
- `duration-150` (fast) — hover, buttons | `duration-250` (normal) — card transitions | `duration-400` (slow) — modals | `duration-600` (reveal) — page load staggers

### Button Utilities (defined via `@utility` in globals.css)
- `btn` — base hover lift (`translateY(-1px)`) and active press (`inset box-shadow overlay`)
- `btn-primary` — terracotta colored shadow at rest + hover
- `btn-danger` — custom hover color `#b04444`
- `btn-no-shadow` — for ghost/soft variants that don't cast colored shadows

### Key Design Rules
- **Borders**: Inputs use `1.5px` borders; all other components (cards, task items, vault items) use `1px`
- **LocationCard** is the signature component — polaroid style with `8px` padding around inset image, `--shadow-polaroid`, slight rotation
- Task check-off is the ONE "delightful" animation — spring bounce at 350ms
- Toast entrance: subtle slide from right (`translateX(20px)`) with spring easing, not full off-screen
- Vault code values appear instantly (no animation), vault reveal is deliberate (400ms)
- Body has SVG noise texture at 2.5% opacity for paper-like warmth

### Tailwind v4 Transition Gotcha
Tailwind v4 uses individual CSS transform properties (`translate`, `rotate`, `scale`) NOT the composite `transform`. When specifying `transition-[...]`, list the individual properties being animated:
- `transition-[translate,rotate,box-shadow]` — NOT `transition-[transform,box-shadow]`
- `transition-[opacity,scale]` — NOT `transition-[opacity,transform]`
The `@utility btn` in globals.css uses raw CSS `transform: translateY(-1px)` directly, so `transition-property: transform` works there.

## Component Conventions

- Props interface named `<ComponentName>Props`; variant types as discriminated unions (e.g. `ButtonVariant`)
- Export both the component and its types (named exports, no default exports)
- `"use client"` directive on interactive components
- Styling: prefer CSS classes in `globals.css` (BEM-like: `.btn-primary`, `.task-item-checkbox`) over inline Tailwind for complex components; use Tailwind utilities for layout (flex, grid, spacing)
- `forwardRef` on components that need ref access

## Responsive Breakpoints

- Mobile: 375px base (bottom nav visible)
- Tablet: 768px
- Desktop: 1024px+ (sidebar visible in CreatorLayout, bottom nav hidden)

Complex responsive layouts use custom CSS media queries in `globals.css` rather than Tailwind breakpoint prefixes.

## Environment

Requires `NEXT_PUBLIC_CONVEX_URL` — see `.env.example`.

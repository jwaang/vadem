# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Convex CRUD pattern**: Each domain file exports `create` mutation, `listBy<X>` query with index, `update` mutation (patch only changed fields via `Object.fromEntries(Object.entries(fields).filter(([, val]) => val !== undefined))`), and `remove` mutation (check existence, throw `ConvexError`, delete). Always include `returns` validator on all functions.
- **Convex polymorphic references**: For `parentId` referencing multiple tables (e.g., instruction/pet/vault), use `v.string()` (not `v.id("tableName")`) paired with a `parentType` discriminant union field.

- **Next.js 16 + ESLint 9 flat config**: Uses `eslint.config.mjs` (not `.eslintrc`). Import `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` as arrays to spread. Add `eslint-config-prettier` last to disable formatting rules.
- **pnpm scripts**: `typecheck` = `tsc --noEmit`, `lint` = `eslint`, `build` = `next build`. All three must pass for every story.
- **Tailwind CSS v4**: Uses `@tailwindcss/postcss` plugin, no `tailwind.config.js` — config is done via CSS `@theme` blocks.
- **Convex codegen without deployment**: Run `npx convex codegen --system-udfs --typecheck disable` to generate `convex/_generated/` without requiring a live Convex deployment. This enables `pnpm build` to pass in CI before a deployment exists.
- **Convex + Next.js SSG**: `ConvexReactClient` constructor throws if URL is empty string. The `ConvexClientProvider` must handle missing `NEXT_PUBLIC_CONVEX_URL` gracefully (skip provider, render children directly) so `next build` can prerender static pages.
- **Convex dev script pattern**: Use `"dev": "npx convex dev --run 'next dev --turbopack'"` to start Convex dev server alongside Next.js in a single command.
- **Design tokens via CSS custom properties + Tailwind v4 `@theme inline`**: All design tokens live in `:root` as CSS custom properties, then mapped into Tailwind via `@theme inline` block in `globals.css`. Use `var(--token-name)` in inline styles and Tailwind utility classes (e.g., `bg-primary`, `shadow-polaroid`, `rounded-lg`) in className.
- **Google Fonts via `next/font/google`**: Use `next/font/google` imports (not `<link>` tags) to avoid `@next/next/no-page-custom-font` lint warning. Each font exports a `variable` CSS property that feeds into the `--font-display`/`--font-body`/`--font-handwritten` tokens.
- **PWA manifest in Next.js 16**: Use `metadata.manifest` for the manifest link, `metadata.appleWebApp` for iOS PWA meta tags, and export a separate `viewport` const for `themeColor` (Next.js 16 splits viewport from metadata).
- **UI components in `src/components/ui/`**: Reusable components live in `src/components/ui/`. Export types alongside components.
- **Tailwind-first styling (critical)**: Use Tailwind utility classes for ALL styling by default. Only add classes to `globals.css` when Tailwind genuinely cannot express it: complex pseudo-selectors (`:focus-within`, `:active:not(:disabled)`), `@keyframes` animations, nested state modifiers (`.component-state .child`), and `@utility` definitions. Never create a `globals.css` class for something expressible as Tailwind utilities — e.g., adding `oauth-btn` or `oauth-divider` classes to `globals.css` is wrong; those should be Tailwind classes directly on the element. When in doubt, use Tailwind.
- **Turbopack CSS caching gotcha**: When adding new CSS classes to `globals.css`, Turbopack may serve a stale cached version even after reload. If new CSS classes show zero matching rules in the browser, kill the dev server, delete `.next/`, and restart. This is especially common when appending large blocks at the end of the file.
- **Horizontal scroll pattern**: Use `overflow-x: auto; -webkit-overflow-scrolling: touch; min-width: max-content` on the inner track, with the outer wrapper doing the scrolling. See EmergencyContactBar and WizardProgress for examples.
- **Step/state CSS pattern**: Use `.[component]-[state]` modifier classes (e.g., `.wizard-step-completed`, `.wizard-step-active`) and nest child selectors like `.wizard-step-completed .wizard-step-dot` for state-specific styling.
- **Dev server**: `pnpm dev` runs Convex which requires interactive terminal. Use `npx next dev --turbopack` directly for browser verification.
- **Tailwind v4 specificity**: Plain CSS `background-color`/`color` on `<button>` elements get overridden by Tailwind's reset layer. Use Tailwind utility classes (`bg-primary`, `text-text-on-primary`, etc.) for visual states on interactive elements, and keep plain CSS only for structural/transition/shadow properties. See Button.tsx and SectionNav.tsx for examples.
- **Layout components in `src/components/layouts/`**: Responsive layout shells (CreatorLayout, SitterLayout) live in `layouts/` dir. They override BottomNav's `position: fixed` to `position: sticky` within their containers via `.creator-layout .bottom-nav` CSS selectors. Breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop).
- **Convex hooks in pages without guaranteed provider**: When a page uses Convex hooks but `NEXT_PUBLIC_CONVEX_URL` may be missing (CI/build), split into an outer component that checks the env var and an inner component holding the hooks. The inner only renders when the var is truthy (ConvexProvider exists). This avoids "useAction must be in ConvexProvider" crashes.
- **`ssr: false` with `next/dynamic` must be in a Client Component**: In Next.js 16, `dynamic(() => import('./X'), { ssr: false })` throws a build error if called in a Server Component. Create a dedicated `"use client"` wrapper component that does the dynamic import.
- **Convex `"use node"` TypeScript inference**: Actions marked `"use node"` lose TypeScript inference for handler return types. Explicitly annotate the handler: `handler: async (ctx, args): Promise<{ ... }> => { ... }` and cast internal mutation results via `as Id<"tablename">`.
- **Convex query handler type — never use Omit spread**: Using `({ field: _, ...rest }) => rest` in a query handler with a `returns` validator causes the entire API type system to infer `any` for that query, cascading to all Doc<T> consumers. Always use explicit object construction: `items.map(item => ({ _id: item._id, otherField: item.otherField, ... }))`.
- **Adding new Convex module**: Manually update `convex/_generated/api.d.ts` to add `import type * as newModule from "../newModule.js"` and `newModule: typeof newModule` in the `fullApi` object. The file is committed to the repo and not auto-regenerated without a live deployment.
- **Convex codegen local binary**: Use `node_modules/.bin/convex codegen --system-udfs --typecheck disable` (not `npx convex codegen`) to avoid downloading a different version. Run `pnpm install` first if `node_modules/.bin/convex` doesn't exist.
- **Auth pages route structure**: Signup at `src/app/signup/` (3 files: `page.tsx` server + metadata, `SignupPageClient.tsx` client wrapper with `dynamic(ssr:false)`, `SignupForm.tsx` form with Convex hooks + env guard). Login at `/login`, dashboard at `/dashboard`, forgot-password at `/forgot-password`.
- **Convex auth file split**: Password hashing via `pbkdf2Sync` requires Node.js — put these in `convex/authActions.ts` with `"use node"` directive. Keep plain queries/mutations in `convex/auth.ts` (no directive). Actions reference internal functions via `internal.auth._fnName`.
- **localStorage auth with SSR guard**: Auth context using `useState(lazyInitFn)` with `if (typeof window === "undefined") return null` guard reads localStorage once on client mount without triggering `react-hooks/set-state-in-effect` lint error. Session stored as `{ token, email }` JSON in `localStorage` under key `handoff_session`.
- **Dashboard redirect guard**: `useEffect(() => { if (!isLoading && !user) router.replace("/login") }, [user, isLoading, router])` — reads session from `useAuth()`, redirects to login if unauthenticated.
- **Convex optional index fields**: Convex indexes work on `v.optional(v.string())` fields — documents missing the field are excluded from `.withIndex(...).eq(someValue)` queries. Safe for OAuth provider IDs that only some users have.
- **`react-hooks/set-state-in-effect` in callback pages**: All synchronous pre-condition checks (missing code, CSRF) should go into a `useState(() => computeInitialState())` lazy initializer, not inside `useEffect`. Async callbacks (`.then`/`.catch`) are allowed to call `setState`.

### Design System (`docs/handoff-design-system.md`)

Full spec at `docs/handoff-design-system.md`. Aesthetic: **Warm Editorial** — earthy tones, generous radius, handwritten accents.

**Typography** (3 fonts, 3 roles):
- `font-display` / Instrument Serif — headings, hero text, wordmark
- `font-body` / Bricolage Grotesque — body text, buttons, inputs, labels
- `font-handwritten` / Caveat — location card captions, personality notes
- Scale: `text-xs`=12px, `text-sm`=14px, `text-base`=16px, `text-lg`=18px, `text-xl`=20px, `text-2xl`=24px, `text-3xl`=30px, `text-4xl`=36px, `text-5xl`=48px, `text-6xl`=60px

**Colors** (Tailwind classes map directly — use `bg-primary`, `text-primary`, etc.):
- **Primary** Terracotta `#C2704A` — primary actions, active states; variants: `-hover` `#A85C38`, `-active` `#934F30`, `-light` `#F5E6DD`, `-subtle` `#FAF0EA`
- **Secondary** Sage `#5E8B6A` — success, completed states; variants: `-hover` `#4D7558`, `-light` `#E4EDE7`, `-subtle` `#F2F7F3`
- **Accent** Amber `#D4943A` — highlights, trip overlays, warnings; variants: `-hover` `#BB7F2E`, `-light` `#FBF0DD`, `-subtle` `#FDF8F0`
- **Vault** Slate `#3D4F5F` — security elements; variants: `-hover` `#2F3F4D`, `-light` `#E8ECF0`, `-subtle` `#F2F4F6`
- **Backgrounds**: `bg-bg` linen `#FAF6F1` (page), `bg-bg-raised` white `#FFFFFF` (cards), `bg-bg-sunken` sand `#F3EDE5` (recessed), `bg-bg-warm-wash` `#FDF8F3`
- **Text**: `text-text-primary` ink `#2A1F1A`, `text-text-secondary` `#6B5A50`, `text-text-muted` `#A89890`, `text-text-on-primary` white
- **Borders**: `border-border-default` `#E8DFD6`, `border-border-strong` `#D4C8BC`, `border-border-focus` = primary
- **Semantic**: `text-success`/`bg-success-light`, `text-warning`/`bg-warning-light`, `text-danger`/`bg-danger-light`

**Border Radius**:
- `rounded-sm`=6px checkboxes/badges, `rounded-md`=10px buttons/inputs/images, `rounded-lg`=14px **cards/task items/vault items/toasts**, `rounded-xl`=20px pet cards/today container, `rounded-2xl`=28px modals/today header, `rounded-pill`=9999px badge pills, `rounded-round`=50% avatars

**Shadows** (warm-tinted `rgba(42,31,26,...)`):
- `shadow-xs` subtle, `shadow-sm` cards at rest, `shadow-md` hover/dropdowns, `shadow-lg` modals/toasts, `shadow-xl` hero elements, `shadow-polaroid` location cards (signature), `shadow-inner` sunken inputs

**Motion**:
- `ease-out` = `cubic-bezier(0.16, 1, 0.3, 1)` — cards, modals, page transitions
- `ease-spring` = `cubic-bezier(0.34, 1.56, 0.64, 1)` — checkboxes, toggles, buttons (slight overshoot)
- Durations: `duration-150` fast hover/press, `duration-250` normal card transitions, `duration-400` slow modal entrance, `duration-600` page load staggers
- **Tailwind v4 transitions**: use individual properties — `transition-[translate,rotate,box-shadow]` NOT `transition-[transform,box-shadow]`; `transition-[opacity,scale]` NOT `transition-[opacity,transform]`

**Key component specs**:
- **LocationCard** (signature): polaroid style, 8px padding around inset image, `rounded-lg`, `shadow-polaroid`, slight rotation (`-1.5deg`/`0deg`/`+1.2deg`), hover `translateY(-4px)` + rotation shift + `shadow-xl`, subtle `ring-1 ring-inset ring-[rgba(42,31,26,0.06)]`
- **TaskItem**: `rounded-lg border py-4 px-5 gap-4`, checkbox 26px `rounded-sm`, completed = `secondary-subtle` bg + strikethrough, `checkPop` spring animation 350ms on check
- **VaultItem**: `rounded-lg border py-4 px-5 gap-4`, revealed = `secondary-subtle` bg, code in monospace `letter-spacing: 0.15em`
- **Button**: hover `translateY(-1px)` + shadow elevation, active inner overlay `rgba(0,0,0,0.06)`, disabled `opacity-40`
- **Input/Textarea**: `1.5px` border (only inputs use 1.5px — all other components use 1px), focus ring `0 0 0 3px --primary-subtle`
- **Borders rule**: inputs = `1.5px`, all other components (cards, task items, vault items) = `1px`
- **Body**: SVG noise texture at 2.5% opacity for paper-like warmth

### Product Overview (`docs/prd.md`)

**Handoff** — PWA for homeowners to create structured, media-rich care manuals for house/pet sitters, shared via a single link. No app download required.

**Two user roles:**
- **Creator** (homeowner): Full account (email/password or OAuth). Builds and manages the manual, creates trips, controls vault access, receives notifications.
- **Sitter** (recipient): No account needed. Link-only access by default; phone-PIN verification unlocks vault; can optionally sign up to become a creator.

**Core features (v1):**
- **Property Manual**: Guided 7-step wizard to build a reusable home care doc — pets, access info, emergency contacts, house sections (appliances, kitchen, trash, plants, house rules, departure)
- **Pet Profiles**: Rich structured profiles — photo, feeding, vet, meds, personality notes, behavioral quirks
- **Location Cards**: Polaroid-style photo/video cards attached to any instruction — "where is it?" problem solver; the signature UI element
- **Trip Overlay + Today View**: Time-bound layer over the manual; creates a time-slotted task list ("today view") the sitter sees upon opening the link
- **Vault**: Secure credentials (alarm codes, WiFi, lockbox) — fully hidden to unverified sitters; phone-PIN gated; access logged with timestamp; auto-expires at trip end
- **Emergency Contacts**: Tap-to-call bar with owner, vet, neighbor, emergency roles
- **Task Check-Off + Proof**: Sitter checks off tasks; optional photo proof with name attribution
- **Activity Feed**: Owner sees real-time feed — who viewed, checked off tasks, accessed vault
- **Sharing**: Unique shareable link per trip; owner can revoke; forwarded link can't access vault

**Epics at a glance** (`docs/handoff-tasks/`):
- epic-01 Foundation/PWA, epic-02 Auth, epic-03 Manual Wizard, epic-04 Location Cards, epic-05 Trip+Today, epic-06 Vault, epic-07 Contacts, epic-08 Tasks+Proof, epic-09 Sharing, epic-10 Notifications, epic-11 Trip Report, epic-12 Offline/PWA, epic-13 Conversion

---

## 2026-02-17 - US-001
- Initialized Next.js 16 project with TypeScript strict mode and App Router
- Configured ESLint with Next.js core-web-vitals + typescript rules + prettier
- Configured Prettier with `.prettierrc` and `.prettierignore`
- Added `typecheck`, `format`, and `format:check` scripts to package.json
- Created README with setup instructions
- Files added: `package.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`, `next.config.ts`, `next-env.d.ts`, `.prettierrc`, `.prettierignore`, `.gitignore`, `pnpm-workspace.yaml`, `README.md`, `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `public/*`
- **Learnings:**
  - `create-next-app` now generates Next.js 16 by default (still satisfies "14+" requirement)
  - ESLint 9 flat config is the default — no more `.eslintrc.*` files
  - Tailwind CSS v4 is the default — no `tailwind.config.js`, uses CSS-based config via `@theme`
  - `create-next-app` won't init in a directory with existing files — must init elsewhere and copy
---

## 2026-02-17 - US-002
- Installed `convex` package (v1.31.7)
- Initialized `convex/` directory with `schema.ts` (empty schema) and `healthCheck.ts` query
- Generated `convex/_generated/` via `npx convex codegen --system-udfs --typecheck disable`
- Created `src/components/ConvexClientProvider.tsx` — client component wrapping `ConvexProvider`
- Wired `ConvexClientProvider` into `src/app/layout.tsx`
- Updated `package.json` dev script: `npx convex dev --run 'next dev --turbopack'`; added `dev:next` for standalone Next.js
- Created `.env.local` and `.env.example` with `NEXT_PUBLIC_CONVEX_URL`
- Updated `.gitignore` to track `.env.example` (`!.env.example`)
- Updated `eslint.config.mjs` to ignore `convex/_generated/**`
- Updated `.prettierignore` to ignore `convex/_generated`
- Files added: `convex/schema.ts`, `convex/healthCheck.ts`, `convex/_generated/*`, `convex/tsconfig.json`, `convex/README.md`, `src/components/ConvexClientProvider.tsx`, `.env.local`, `.env.example`
- Files modified: `package.json`, `src/app/layout.tsx`, `eslint.config.mjs`, `.prettierignore`, `.gitignore`
- **Learnings:**
  - `npx convex codegen` requires `CONVEX_DEPLOYMENT` env var — but `--system-udfs` flag bypasses this check, allowing offline codegen
  - Convex codegen generates `.js` + `.d.ts` files (not `.ts`) by default; this is expected and works with TS projects
  - `ConvexReactClient("")` throws "Provided address was not an absolute URL" — must guard against empty/missing URL for SSG builds
  - Convex's `--run` flag on `convex dev` is the recommended way to start both servers; it sets env vars automatically
---

## 2026-02-17 - US-003
- Implemented all design tokens from `docs/handoff-design-system.md` as CSS custom properties in `:root`
- Mapped tokens to Tailwind v4 via `@theme inline` block (colors, fonts, shadows, radii, easing, durations)
- Loaded 3 Google Fonts via `next/font/google`: Instrument Serif (display), Bricolage Grotesque (body/UI), Caveat (handwritten)
- Implemented linen background with inline SVG noise texture at 2.5% opacity on `body`
- Updated `page.tsx` with token showcase (headings, color swatches, card with polaroid shadow, badge pills)
- Removed default Geist fonts and dark mode styles
- Files modified: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- **Learnings:**
  - `@next/next/no-page-custom-font` warns if you use `<link>` for Google Fonts in layout — must use `next/font/google` imports instead
  - `next/font/google` `Instrument_Serif` only supports `weight: "400"` (not variable weight), but supports `style: ["normal", "italic"]`
  - Tailwind v4 `@theme inline` maps CSS custom properties to utility classes — e.g., `--color-primary: var(--primary)` enables `bg-primary`, `text-primary` etc.
  - SVG noise texture works as inline data URI in `background-image` — no external file needed
  - Font variable names from `next/font` (e.g., `--font-instrument-serif`) must be used in the CSS `--font-display` token, not the raw font name
---

## 2026-02-17 - US-019
- Configured PWA manifest at `public/manifest.json` with app name "Handoff", theme color `#C2704A`, background `#FAF6F1`, standalone display
- Generated app icons at `public/icons/icon-192x192.png` and `public/icons/icon-512x512.png` (branded with "H" on theme color background)
- Created service worker at `public/sw.js` with network-first caching strategy (precaches `/` and `/manifest.json`, caches all GET requests on fetch)
- Created `src/components/ServiceWorkerRegistrar.tsx` — client component that registers the service worker on mount
- Updated `src/app/layout.tsx` — added manifest link, apple-web-app meta tags, theme-color viewport, apple-touch-icon, and ServiceWorkerRegistrar
- Files added: `public/manifest.json`, `public/icons/icon-192x192.png`, `public/icons/icon-512x512.png`, `public/sw.js`, `src/components/ServiceWorkerRegistrar.tsx`
- Files modified: `src/app/layout.tsx`
- **Learnings:**
  - Next.js 16 requires `themeColor` to be in a separate `export const viewport: Viewport` — it cannot go in the `metadata` export
  - Service workers in `public/` are served at root path by Next.js, so `public/sw.js` → `/sw.js`
  - Pure Node.js PNG generation works via `zlib.deflateSync` on raw RGBA pixel data — no external image libraries needed for placeholder icons
  - macOS has `sips` for image conversion but it can't create PNGs from scratch; programmatic generation is more reliable
---

## 2026-02-17 - US-004
- Created `Button` component at `src/components/ui/Button.tsx` with `forwardRef` support
- Implemented 6 variants: primary (terracotta), secondary (sage), vault (slate), ghost (transparent+border), soft (primary-light), danger
- Implemented 3 sizes: lg (`16px 32px`, radius-lg), default (`12px 20px`, radius-md), sm (`8px 12px`, radius-sm)
- Leading icon slot via `icon` prop (renders in `<span className="btn-icon">`)
- Hover: `translateY(-1px)` + shadow elevation + darker background (all variants)
- Active: `inset 0 0 0 100px rgba(0,0,0,0.06)` overlay on all variants
- Primary casts colored shadow `0 4px 14px rgba(194,112,74,0.25)` at rest, intensifies on hover
- Disabled: `opacity: 0.4` + `cursor: not-allowed` + `pointer-events: none`
- Button CSS classes added to `globals.css` for interactive states; Tailwind utilities for static styles
- Updated `page.tsx` with full button showcase (variants, sizes, icons, disabled, size×variant matrix)
- Verified at 375px viewport — all buttons render correctly and wrap properly
- Files added: `src/components/ui/Button.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - For complex interactive states (hover shadow transitions, active overlays, colored shadows), CSS classes in `globals.css` are cleaner than inline styles or Tailwind utilities — especially when needing `:active:not(:disabled)` selectors
  - Tailwind v4's `bg-transparent` class can be used as a CSS selector (`.btn.bg-transparent`) to target ghost variant without extra classes
  - `inset 0 0 0 100px rgba(0,0,0,0.06)` creates a uniform inner overlay effect — the large spread covers the entire button regardless of size
  - Using `border: none` in base `.btn` then adding `border` via Tailwind on ghost variant works well — the ghost variant's `border border-border-default` overrides correctly
---

## 2026-02-17 - US-005
- Created `Input` component at `src/components/ui/Input.tsx` with `forwardRef` support, label, hint text, and error state
- Created `Textarea` component at `src/components/ui/Textarea.tsx` with `forwardRef`, vertical-only resize, min-height 100px
- Created `SearchBar` component at `src/components/ui/SearchBar.tsx` with inline magnifying glass icon, sunken default bg, raised bg on focus
- Added CSS classes in `globals.css`: `.input-wrapper`, `.input-label`, `.input-field`, `.input-error`, `.input-textarea`, `.input-hint`, `.input-hint-error`, `.search-bar-wrapper`, `.search-bar-icon`, `.search-bar-input`
- Updated `page.tsx` with full input component showcase (text inputs with label/hint/error, textareas, search bar)
- Verified at 375px viewport — all inputs render correctly, focus/error states work as expected
- Files added: `src/components/ui/Input.tsx`, `src/components/ui/Textarea.tsx`, `src/components/ui/SearchBar.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - CSS `focus-within` on the wrapper (`.search-bar-wrapper:focus-within .search-bar-icon`) is cleaner than JS state for changing icon color on input focus
  - `box-shadow: 0 0 0 3px var(--primary-subtle)` creates a soft focus ring without affecting layout — works alongside border-color change for double visual cue
  - For SearchBar left padding, `calc(var(--space-3) + 18px + var(--space-2))` accounts for padding + icon width + gap — avoids hardcoded magic numbers
  - `shadow-inner` token (`inset 0 1px 3px rgba(42,31,26,0.06)`) on SearchBar default state creates the "sunken" feel specified in the design system
  - Sharing CSS class names (`.input-field`, `.input-hint`) between Input and Textarea avoids duplication — Textarea just adds `.input-textarea` for min-height and resize
---

## 2026-02-17 - US-006
- Created `Badge` component at `src/components/ui/Badge.tsx` with 7 variants: overlay, room, vault, success, warning, danger, time
- Overlay badge prefixed with `✦`, vault badge prefixed with `🔒` — prefixes defined in component via partial record
- Added CSS classes in `globals.css`: `.badge` (base), `.badge-overlay`, `.badge-room`, `.badge-vault`, `.badge-success`, `.badge-warning`, `.badge-danger`, `.badge-time`
- All badges: 12px font (`--text-xs`), 600 weight, pill radius (`--radius-pill`), `3px 10px` padding
- Overlay, room, vault variants include border; success, warning, danger, time are borderless
- Room badges accept dynamic text (e.g., "Kitchen", "Garage") via children
- Time badges accept time strings (e.g., "7:00 AM") via children
- Updated `page.tsx` with full badge showcase section
- Verified in browser at localhost:3000 — all variants render correctly
- Files added: `src/components/ui/Badge.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - Badge component is simpler than Button — no need for `forwardRef` or `"use client"` since it's a pure presentational `<span>` with no event handlers or state
  - Using a `Partial<Record<BadgeVariant, string>>` for prefixes cleanly handles variants that have no prefix without conditional logic
  - Warning badge text color `#8B6420` is a custom dark amber — not a design token, hardcoded in CSS since it's specific to the warning badge contrast needs
  - `line-height: 1` on badges prevents extra vertical space from the default line-height, keeping the pill shape tight
---

## 2026-02-17 - US-007
- Implemented LocationCard component — polaroid-style photo card with handwritten Caveat caption and room badge
- Files changed:
  - `src/components/ui/LocationCard.tsx` (new) — component with tilt variants, placeholder state, fullscreen overlay
  - `src/app/globals.css` — added Location Card CSS section (~120 lines)
  - `src/app/page.tsx` — added LocationCard import and showcase section with 4 examples
- **Learnings:**
  - Tilt hover transitions need per-variant overrides (tilted-left hover shifts to -2deg, neutral to -0.5deg, tilted-right to 0.7deg) for natural feel — a single hover rule would snap all tilts to the same angle
  - `<img>` used intentionally over `next/image` for external URLs (avoids `remotePatterns` config) and fullscreen overlay; lint warnings are expected
  - The `aspect-ratio: 4 / 3` CSS property works well for the photo container without padding-bottom hacks
  - `role="dialog"` + `aria-label` on the overlay provides good a11y tree structure automatically
  - Placeholder card deliberately omits `role="button"` and `tabIndex` since there's nothing to expand
---

## 2026-02-17 - US-008
- Created `PetProfileCard` component at `src/components/ui/PetProfileCard.tsx` with hero photo, details, and personality note
- Structure: 1:1 hero photo (or gradient placeholder) + name (Instrument Serif) + breed/age meta + detail rows + personality note
- Detail rows: emoji icon (24px) + label + value, with optional `tel:` link in sage/secondary color for phone numbers
- Personality note rendered in Caveat handwritten font on accent-subtle background
- Placeholder gradient: linear-gradient from primary-light → accent-light → secondary-light at 135deg
- Hover: shadow-md → shadow-lg elevation
- Added CSS classes in `globals.css`: `.pet-card`, `.pet-card-hero`, `.pet-card-img`, `.pet-card-placeholder`, `.pet-card-body`, `.pet-card-name`, `.pet-card-meta`, `.pet-card-details`, `.pet-card-detail-row`, `.pet-card-detail-emoji`, `.pet-card-detail-label`, `.pet-card-detail-value`, `.pet-card-detail-phone`, `.pet-card-personality`
- Updated `page.tsx` with Pet Profile Card showcase
- Files added: `src/components/ui/PetProfileCard.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
---

## 2026-02-17 - US-009
- Created `TaskItem` component at `src/components/ui/TaskItem.tsx` with checkbox toggle, badges, and proof button
- Supports controlled and uncontrolled completion state via `completed` / `defaultCompleted` props
- Checkbox: 26px rounded square with sage/secondary fill + white checkmark SVG on completion, spring `checkPop` animation
- Completed state: secondary-subtle bg, line-through text in muted color
- Overlay state: 3px left border in accent color
- Meta row: time badge, room badge, overlay badge ("This Trip Only") via Badge component
- Proof button: dashed border, camera icon, hover highlights in primary color
- Accessible: `role="checkbox"`, `aria-checked`, keyboard support (Space/Enter)
- Added CSS classes in `globals.css`: `.task-item`, `.task-item-completed`, `.task-item-overlay`, `.task-item-checkbox`, `.task-item-checkbox-checked`, `.task-item-checkmark`, `.task-item-body`, `.task-item-text`, `.task-item-meta`, `.task-item-proof`, `@keyframes checkPop`
- Updated `page.tsx` with Task Item showcase
- Files added: `src/components/ui/TaskItem.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
---

## 2026-02-17 - US-010
- Created `VaultItem` component at `src/components/ui/VaultItem.tsx` with three states: revealed, locked, hidden
- Structure: icon (44px, --radius-md, --vault bg, white icon) + label/hint + value or verify button
- Revealed state: --secondary-subtle bg, --secondary-light border, monospace code with letter-spacing 0.15em
- Locked state (unverified): --vault-subtle bg, --vault-light border, shows label + hint + verify button
- Hidden state: --vault-subtle bg, --vault-light border, no label/code shown, only "verify your phone number" message + verify button — no blurred/teased state
- Exported `LockIcon` helper SVG component for default vault icon usage
- Added CSS classes in `globals.css`: `.vault-item`, `.vault-item-revealed`, `.vault-item-locked`, `.vault-item-icon`, `.vault-item-content`, `.vault-item-label`, `.vault-item-hint`, `.vault-item-message`, `.vault-item-value`, `.vault-item-action`
- Updated `page.tsx` with vault item showcase showing all three states
- Files added: `src/components/ui/VaultItem.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - VaultItem is a pure presentational component (no `"use client"` needed) since Button handles its own client-side concerns — the VaultItem just renders conditionally based on `state` prop
  - `ui-monospace, 'Courier New', monospace` is the standard system monospace font stack — works across macOS (SF Mono), Windows (Cascadia Code), and Linux (Ubuntu Mono)
  - For multi-state components, a single CSS base class (`.vault-item`) + state modifier classes (`.vault-item-revealed`, `.vault-item-locked`) is cleaner than variant maps when only background/border change between states
  - `min-width: 0` on the flex content area prevents long label text from overflowing the flex container — essential for vault items with long credential names
---

## 2026-02-17 - US-011
- Created `EmergencyContactBar` component at `src/components/ui/EmergencyContactBar.tsx` with horizontally scrollable contact chips
- Per contact chip: 36px round icon (color-coded by role) + name + role label + `Call` link with `tel:` href
- Icon colors: owner (`--primary-light`), vet (`--secondary-light`), neighbor (`--accent-light`), emergency (`--danger-light`)
- Hover state: border changes to `--secondary`, bg changes to `--secondary-subtle`
- `-webkit-overflow-scrolling: touch` for smooth mobile scroll
- `min-width: max-content` on each chip prevents text wrapping
- Default icon shows role initial letter (O/V/N/E) with role-specific text color; custom icon slot via `icon` prop
- Added CSS classes in `globals.css`: `.contact-bar`, `.contact-bar-scroll`, `.contact-chip`, `.contact-chip-icon`, `.contact-chip-icon-text`, `.contact-chip-info`, `.contact-chip-name`, `.contact-chip-role`, `.contact-chip-call`
- Updated `page.tsx` with Emergency Contact Bar showcase (5 sample contacts)
- Verified at 375px mobile viewport — horizontal scroll works, `tel:` links correct
- Files added: `src/components/ui/EmergencyContactBar.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - `-webkit-overflow-scrolling: touch` still needed for iOS momentum scrolling in 2026 — standard `overflow-x: auto` alone doesn't give the rubber-band feel
  - `scrollbar-width: thin` on the scroll container gives a subtle scrollbar hint on desktop without the chunky default
  - Using `"use client"` is needed here because of the `onClick` handler on the Call link (`e.stopPropagation()`)
  - `min-width: max-content` on flex children inside an overflow scroll container is the cleanest way to prevent chips from shrinking
---

## 2026-02-17 - US-012
- Created `TodayViewHeader` component at `src/components/ui/TodayViewHeader.tsx` with greeting, day counter, and summary stats
- Structure: decorative circle + greeting heading (Instrument Serif) + "Day X of Y" subtext + stat chips row
- Stat chips: 3 chips showing tasks today, completed, and proof needed — each with bold value + muted label
- Decorative circle: 120px warm-wash gradient with primary-light border, positioned top-right
- Background: warm-wash with bottom border
- Added CSS classes in `globals.css`: `.today-header`, `.today-header-circle`, `.today-header-content`, `.today-header-greeting`, `.today-header-date`, `.today-header-stats`, `.today-header-chip`, `.today-header-chip-value`, `.today-header-chip-label`
- Updated `page.tsx` with Today View Header showcase
- Files added: `src/components/ui/TodayViewHeader.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
---

## 2026-02-17 - US-013
- Implemented 6-step Wizard Progress Indicator component
- Files changed:
  - `src/components/ui/WizardProgress.tsx` (new) — Component with 3 step states: completed (sage + checkmark), active (terracotta + number + shadow), upcoming (outlined + muted)
  - `src/app/globals.css` — Added `.wizard-progress`, `.wizard-step`, `.wizard-connector` CSS classes
  - `src/app/page.tsx` — Added WizardProgress demo section showing steps 1, 3, and 6
- **Learnings:**
  - Connector line vertical centering: `margin-top: 15px` to align 2px line with center of 32px dot
  - `min-width: max-content` on the `<ol>` track ensures all 6 steps stay in a single row and scroll on narrow screens
  - Using `<nav>` + `<ol>` for semantic step navigation with `aria-label="Setup progress"` and `aria-current="step"` on active step
  - The colored shadow on the active dot (`0 4px 14px rgba(194,112,74,0.35)`) reuses the same terracotta shadow pattern from `.btn-primary`
---

## 2026-02-17 - US-014
- Implemented Section Navigation component — horizontal scrollable pills for navigating manual sections in sitter view
- Files changed:
  - `src/components/ui/SectionNav.tsx` (new) — Pill navigation with emoji + label, controlled/uncontrolled active state, `role="tablist"`/`role="tab"` ARIA semantics
  - `src/app/globals.css` — Added `.section-nav`, `.section-nav-track`, `.section-nav-pill`, `.section-nav-pill-active`, `.section-nav-emoji` CSS classes
  - `src/app/page.tsx` — Added SectionNav demo section with two examples (controlled with `activeId` and uncontrolled default)
- **Learnings:**
  - `onSelect` conflicts with `HTMLAttributes<HTMLElement>` native prop — renamed to `onSectionChange` to avoid TS2430 interface incompatibility
  - Tailwind v4 button reset overrides plain CSS `background-color`/`color` — must use Tailwind utility classes (`bg-primary`, `text-text-on-primary`, `border-primary`) for visual states on `<button>` elements, keeping CSS only for structural layout, transitions, and shadows
  - Colored shadow on active pill (`0 2px 8px rgba(194,112,74,0.25)`) kept in CSS since `box-shadow` is not affected by Tailwind's reset layer
---

## 2026-02-17 - US-015
- Implemented NotificationToast component — owner-facing toast notifications with 3 variants
- Files changed:
  - `src/components/ui/NotificationToast.tsx` (new) — Client component with success/vault/warning variants, auto-dismiss (5s default), manual close, slide-from-right entrance animation
  - `src/app/globals.css` — Added `.notification-toast`, `.notification-toast-[variant]`, `.notification-toast-exit`, `.notification-toast-icon`, `.notification-toast-content`, `.notification-toast-title`, `.notification-toast-message`, `.notification-toast-timestamp`, `.notification-toast-close` CSS classes + `@keyframes notification-toast-slide-in/out`
  - `src/app/page.tsx` — Added NotificationToast demo section with all 3 variants (auto-dismiss disabled for showcase)
- **Learnings:**
  - Turbopack CSS caching is aggressive — after appending new CSS blocks to `globals.css`, the dev server may serve stale styles. Fix: kill server, `rm -rf .next/`, restart. This wasted significant debugging time.
  - Exit animation state management: when using `exiting` + `internalVisible` states for enter/exit animations, must reset `exiting = false` in the timeout callback alongside setting `internalVisible = false`, otherwise the guard `if (!visible && !exiting) return null` never triggers (both conditions must be true to unmount).
  - Component prefix naming convention: used `notification-toast-*` prefix for all CSS classes, consistent with `task-item-*`, `vault-item-*`, `section-nav-*` pattern in the codebase.
  - Entrance animation uses `var(--ease-spring)` (cubic-bezier 0.34, 1.56, 0.64, 1) for the bouncy slide-in, exit uses `var(--ease-out)` for smooth departure.
---

## 2026-02-17 - US-016
- Created `BottomNav` component at `src/components/ui/BottomNav.tsx` with 4-tab mobile bottom navigation
- 4 tabs: Today (clock icon), Manual (book icon), Vault (lock icon), Contacts (people icon) — all SVG icons inline
- Active tab: `--primary` (terracotta) color via Tailwind `text-primary`; inactive: `--text-muted` via Tailwind `text-text-muted`
- Tab labels: `text-xs` (12px), 500 weight per acceptance criteria
- Top border radius `--radius-xl` on both corners, upward shadow (`0 -4px 16px rgba(42,31,26,0.08)`)
- Fixed to bottom of viewport with `position: fixed; bottom: 0; left: 0; right: 0; z-index: 100`
- Safe area inset padding for notched devices: `padding-bottom: calc(var(--space-2) + env(safe-area-inset-bottom))`
- Controlled/uncontrolled state via `activeTab` + `onTabChange` props (same pattern as SectionNav)
- Added inline demo (non-fixed) and fixed nav to `page.tsx` showcase; added 80px bottom padding to container
- CSS classes in `globals.css`: `.bottom-nav`, `.bottom-nav-tab`, `.bottom-nav-icon`, `.bottom-nav-label`
- Files added: `src/components/ui/BottomNav.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - Tailwind v4 button reset pattern applies here too — use Tailwind utility classes (`text-primary`, `text-text-muted`) for color on `<button>` elements, CSS only for structural/transition properties
  - `env(safe-area-inset-bottom)` in `calc()` for bottom padding handles iPhone notch/home indicator without affecting non-notched devices
  - `-webkit-tap-highlight-color: transparent` removes the blue flash on mobile tap for button elements
  - Upward shadow uses negative Y offset (`0 -4px 16px`) — same warm-tinted rgba as the design system shadows
---

## 2026-02-18 - US-017
- Created `TimeSlotDivider` component at `src/components/ui/TimeSlotDivider.tsx` with 3 variants: morning, afternoon, evening
- Structure: 32px round icon (emoji on colored bg) + uppercase label + horizontal line filling remaining width
- Variant backgrounds: morning (`--accent-light`), afternoon (`--primary-light`), evening (`--vault-light`)
- Label: `--text-xs`, 600 weight, `--tracking-wide` letter-spacing, `--text-muted` color, uppercase
- Horizontal line: 1px height, `--border` color, `flex: 1` to fill remaining width
- Pure presentational component — no `"use client"` needed, no state, no event handlers
- `role="separator"` with `aria-label` for accessibility
- Added CSS classes in `globals.css`: `.time-slot-divider`, `.time-slot-divider-morning`, `.time-slot-divider-afternoon`, `.time-slot-divider-evening`, `.time-slot-divider-icon`, `.time-slot-divider-label`, `.time-slot-divider-line`
- Updated `page.tsx` with Time Slot Divider showcase section
- Files added: `src/components/ui/TimeSlotDivider.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - Simple divider components don't need `"use client"` — they're pure layout with no interactivity
  - `flex: 1` on the line element with `min-width: 20px` ensures the line always fills remaining space but never collapses to zero
  - Using variant-specific CSS classes (`.time-slot-divider-morning .time-slot-divider-icon`) for background colors keeps the component logic simple — just a slot config record mapping variant → emoji + label
---

## 2026-02-18 - US-018
- Created `ActivityFeedItem` component at `src/components/ui/ActivityFeedItem.tsx` — activity log entry with color-coded dot, bold name, action text, and timestamp
- 4 activity types with 8px color-coded dots: `view` (terracotta/primary), `task` (sage/secondary), `vault` (slate/vault), `proof` (amber/accent)
- Text: bold name (`--text`, 600 weight) + action text (`--text-secondary`, `--text-sm`) on one line, timestamp (`--text-xs`, `--text-muted`) below
- Items separated by 1px bottom border via `.activity-feed-item-bordered` class; `hideBorder` prop for last item
- Pure presentational component — no `"use client"` needed, no state or event handlers
- Added CSS classes in `globals.css`: `.activity-feed-item`, `.activity-feed-item-bordered`, `.activity-feed-dot`, `.activity-feed-dot-view`, `.activity-feed-dot-task`, `.activity-feed-dot-vault`, `.activity-feed-dot-proof`, `.activity-feed-content`, `.activity-feed-text`, `.activity-feed-name`, `.activity-feed-timestamp`
- Updated `page.tsx` with Activity Feed showcase (5 sample items in a bordered card container)
- Files added: `src/components/ui/ActivityFeedItem.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - Curly/smart quotes (`\u201c` / `\u201d`) in JSX string attributes cause TS parse errors — must use `{'string with \u201cquotes\u201d'}` expression syntax instead
  - `margin-top: 6px` on the 8px dot aligns it vertically with the center of `text-sm` (14px) text — formula: `(lineHeight * fontSize - dotSize) / 2`
  - The `hideBorder` prop pattern (opt-out rather than opt-in) keeps the common case clean — most items have borders, only the last one opts out
---

## 2026-02-18 - US-020
- Set up responsive app layout shell with two layout components: CreatorLayout and SitterLayout
- CreatorLayout: sidebar nav (desktop 1024px+) with "Handoff" logo + 3 nav items (My Property, Trips, Settings), bottom nav (mobile/tablet), main content area with responsive max-widths (960px desktop, 720px tablet, 768px mobile)
- SitterLayout: full-width mobile-first layout with bottom nav always visible, content max-width 640px centered, Today view as default
- Breakpoints: 375px (mobile), 768px (tablet), 1024px (desktop) — all verified in browser
- Layout BottomNav override: within layout shells, BottomNav uses `position: sticky` instead of `position: fixed` so it stays within the layout container
- Both layouts use `min-height: 100dvh` with flex column for full-height stretching
- Files added: `src/components/layouts/CreatorLayout.tsx`, `src/components/layouts/SitterLayout.tsx`
- Files modified: `src/app/globals.css`, `src/app/page.tsx`
- **Learnings:**
  - Layout components go in `src/components/layouts/` (new directory) to distinguish from UI primitives in `src/components/ui/`
  - The BottomNav has `position: fixed` in its base CSS — to embed it within layout containers, override with `.creator-layout .bottom-nav, .sitter-layout .bottom-nav { position: sticky }` so it sticks to the layout bottom instead of the viewport
  - `100dvh` (dynamic viewport height) is better than `100vh` for mobile layouts because it accounts for the browser chrome (address bar, etc.)
  - Sidebar uses `position: sticky; top: 0; height: 100dvh` to stay visible while the main content scrolls — this avoids needing a separate scroll container for the sidebar
  - Controlled/uncontrolled pattern for sidebar nav follows the same pattern as BottomNav and SectionNav (internal state + optional external control)
---

## 2026-02-18 - US-021
- Implemented creator signup with email and password authentication
- Added `users` table to Convex schema with `by_email` index for email uniqueness queries
- Created `convex/users.ts` with `create` internal mutation that checks email uniqueness and throws `EMAIL_TAKEN` error
- Created `src/app/signup/page.tsx` (server component) with metadata, wordmark, heading, and sign-in link
- Created `src/app/signup/SignupPageClient.tsx` (client wrapper) that uses `dynamic(ssr: false)` to lazy-load the form — required because `ssr: false` cannot be used in Server Components
- Created `src/app/signup/SignupForm.tsx` with guard pattern: outer component checks `NEXT_PUBLIC_CONVEX_URL` and renders a fallback when Convex is not configured; inner `SignupFormInner` holds all Convex hooks
- Client-side validation: email format check, password ≥ 8 characters, passwords match
- On success: redirects to `/wizard` via `router.push`
- Files added: `convex/users.ts`, `src/app/signup/page.tsx`, `src/app/signup/SignupPageClient.tsx`, `src/app/signup/SignupForm.tsx`
- Files modified: `convex/schema.ts`, `convex/_generated/` (re-generated)

---

## 2026-02-18 - US-022
- Refactored auth into `convex/auth.ts` (internal mutations/queries) + `convex/authActions.ts` (`"use node"` actions)
- Schema updated: `users` table gains `salt` field; `sessions` table added (userId, token, expiresAt) with `by_token` index
- `auth.ts`: `_createUser`, `_createSession` (internal mutations); `_getUserByEmail` (internal query); `validateSession`, `signOut` (public)
- `authActions.ts`: `signUp` and `signIn` node actions using `pbkdf2Sync` (100k iterations) + `randomBytes` from `node:crypto`
- `src/lib/authContext.tsx`: `AuthProvider` with lazy `useState(readStoredUser)`; persists `{ token, email }` to `localStorage` key `handoff_session`; exports `useAuth()` hook
- Pages: `src/app/login/` (page + LoginFormWrapper + LoginForm), `src/app/dashboard/page.tsx` (protected), `src/app/forgot-password/page.tsx` (placeholder)
- Root layout wrapped with `<AuthProvider>`
- Files added: `convex/authActions.ts`, `src/lib/authContext.tsx`, `src/app/login/*`, `src/app/dashboard/page.tsx`, `src/app/forgot-password/page.tsx`
- Files modified: `convex/auth.ts`, `convex/schema.ts`, `src/app/layout.tsx`, `convex/_generated/*`
- **Learnings:**
  - Convex `"use node"` directive applies to the whole file — keep node actions in a separate file from plain mutations/queries
  - `react-hooks/set-state-in-effect` lint rejects `setState` in `useEffect` body — use lazy `useState(() => readFromStorage())` with SSR guard instead
  - Convex Actions hang with a fake URL (WebSocket never times out) — sufficient for UI verification but not real auth testing
---

## 2026-02-18 - US-023
- Added Google and Apple OAuth buttons to signup and login pages
- Backend: `exchangeOAuthCode` Convex node action handles Authorization Code flow for both providers; creates or merges accounts by email (same email across providers links to same user record)
- Schema: `users` table gets optional `googleId`, `appleId` fields with indexes; `passwordHash`/`salt` made optional (OAuth users have no password)
- `auth.ts`: added `_getUserByGoogleId`, `_getUserByAppleId`, `_linkOAuthProvider` internal functions
- Apple Sign In: client secret JWT built with `node:crypto` `createSign('SHA256')` (ES256); `id_token` payload decoded for user ID and email
- OAuth buttons live in `src/components/ui/OAuthButtons.tsx`; Google uses official logo SVG + white/gray button; Apple uses  logo + black button
- Callback routes: `src/app/auth/callback/google/` and `src/app/auth/callback/apple/` — follow the `ssr:false` dynamic import pattern; state param CSRF check via sessionStorage
- Files added: `src/components/ui/OAuthButtons.tsx`, `src/app/auth/callback/CallbackHandler.tsx`, `src/app/auth/callback/CallbackPageClient.tsx`, `src/app/auth/callback/google/page.tsx`, `src/app/auth/callback/apple/page.tsx`
- Files modified: `convex/schema.ts`, `convex/auth.ts`, `convex/authActions.ts`, `convex/users.ts`, `src/app/signup/SignupForm.tsx`, `src/app/login/LoginForm.tsx`, `src/app/globals.css`, `.env.example`, `convex/_generated/*`
- **Learnings:**
  - `react-hooks/set-state-in-effect` blocks synchronous `setState` calls anywhere in `useEffect` body — move all sync pre-condition checks into a `useState(() => computeInitialState())` lazy initializer instead; async callbacks (`.catch`, `.then`) are fine
  - Convex indexes work on optional fields: documents without the indexed field are effectively excluded from `withIndex(...).eq(someValue)` queries — safe to index `googleId`/`appleId` which are undefined for password users
  - Convex `"use node"` actions can call `node:crypto`'s `createSign('SHA256')` with an EC private key to produce ES256 (ECDSA) signatures for Apple's client secret JWT without any external JWT library
  - Making schema fields optional (`v.optional(v.string())`) is backward-compatible with `ctx.db.insert()` — just omit the field or pass `undefined`; existing queries that don't reference the optional field continue to work
---

## 2026-02-18 - US-024
- Implemented full creator dashboard shell replacing the placeholder `src/app/dashboard/page.tsx`
- Dashboard wraps in `CreatorLayout` (sidebar + bottom nav); sidebar state controls which view renders
- **Three view sections driven by `activeNav` state:**
  - `"property"` (default) → `DashboardOverview`: greeting, property summary card (empty state "Let's set up your home"), active trip status (empty state "No active trips / Create your first trip"), recent activity preview with `ActivityFeedItem`
  - `"trips"` → `TripsSection`: empty state CTA + "How trips work" numbered guide
  - `"settings"` → `SettingsSection`: account email card with Active badge + sign-out button that clears auth and redirects to `/login`
- All empty states use a shared `EmptyStateCard` component (icon, title, description, CTA button)
- Icons (House, Calendar, Clock) defined inline as typed SVG components — no external icon library needed
- Logout flow: `signOut()` from `useAuth()` then `router.push("/login")` — confirmed working in browser
- Files changed: `src/app/dashboard/page.tsx` (complete rewrite)
- **Learnings:**
  - `CreatorLayout` is controlled-nav-friendly: pass `activeNav` + `onNavChange` props and manage state in the parent page — the sidebar highlights correctly and the parent renders appropriate content
  - `BottomNav` on mobile shows sitter-oriented tabs (Today/Manual/Vault/Contacts) even within `CreatorLayout` — this is a placeholder until a creator-specific mobile nav is built in a later story; the sidebar satisfies the desktop navigation AC
  - Email → display name extraction: `email.split("@")[0].replace(/[^a-zA-Z]/g, " ").split(" ")[0]` gives a reasonable first-name guess without a separate name field
  - `dev-browser` server runs on port 9222 (not 3001); connect with default `connect()` which defaults to `http://localhost:9222`
---

## 2026-02-18 - US-025
- Implemented Property data model in Convex with four tables and CRUD operations
- **Files changed:**
  - `convex/schema.ts` — Added `properties`, `manualSections`, `instructions`, `locationCards` tables with compound indexes
  - `convex/properties.ts` — create, get, listByOwner, update, remove
  - `convex/sections.ts` — create, listByProperty, update, remove
  - `convex/instructions.ts` — create, listBySection, update, remove
  - `convex/locationCards.ts` — create, listByParent, update, remove
  - `src/app/dashboard/page.tsx` — Fixed pre-existing `react-hooks/set-state-in-effect` lint error with inline disable comment (SSR hydration pattern)
- **Learnings:**
  - `v.id("_storage")` is the correct Convex validator for storage file references (used for property photo)
  - Compound indexes: `.index("by_property_sort", ["propertyId", "sortOrder"])` — array order matters; first field is the equality filter, second is the range/order field
  - For polymorphic `parentId` (instruction/pet/vault), `v.string()` is correct since Convex typed IDs are table-specific
  - Pre-existing lint error in `dashboard/page.tsx` (`setMounted(true)` in empty-dep `useEffect`) was already committed; fixed with `// eslint-disable-next-line react-hooks/set-state-in-effect`
---

## 2026-02-18 - US-026
- Implemented wizard step 1 "Add your home" at `/wizard/1`
- **Files changed:**
  - `convex/schema.ts` — Made `address` optional (`v.optional(v.string())`) in `properties` table to support partial "save & finish later" saves
  - `convex/properties.ts` — Updated `create`/`get`/`listByOwner` returns validators to reflect optional address; added `createOrUpdate` upsert mutation (finds existing property by owner, patches or creates)
  - `convex/storage.ts` — New file: `generateUploadUrl` action (returns presigned upload URL) and `getUrl` query (resolves storageId → public URL)
  - `src/app/wizard/page.tsx` — Redirects `/wizard` → `/wizard/1`
  - `src/app/wizard/[step]/page.tsx` — Server component: parses `step` param, renders `WizardStepClient`
  - `src/app/wizard/[step]/WizardStepClient.tsx` — "use client" + `dynamic(ssr:false)` wrapper (same pattern as SignupPageClient)
  - `src/app/wizard/[step]/WizardStepInner.tsx` — Env guard + `WizardLayout` (wordmark, WizardProgress, step card) + step routing (step 1 → Step1Home, others → ComingSoon)
  - `src/app/wizard/[step]/Step1Home.tsx` — Step 1 form: property name (required), address (optional), photo upload with `URL.createObjectURL` preview thumbnail, Next → `/wizard/2`, Save & finish later → `/dashboard`
- **Learnings:**
  - Convex file upload pattern: `generateUploadUrl` action → `fetch(url, { method: "POST", body: file })` → `response.json()` returns `{ storageId }` → pass to mutation as `v.id("_storage")`
  - `URL.createObjectURL(file)` gives instant local preview without uploading; revoke with `URL.revokeObjectURL(url)` on removal to avoid memory leaks
  - Wizard layout is a React component (not Next.js layout) since `WizardProgress currentStep` must be derived from the URL param — avoids needing a `usePathname()` client layout
  - `useQuery(api.auth.validateSession, user?.token ? { token } : "skip")` is the clean pattern to get userId from session token; "skip" prevents the query from running when there's no token
  - Photo preview uses `<img>` with `eslint-disable-next-line @next/next/no-img-element` since it's a local blob URL (no `next/image` optimization possible for blob URLs)
  - `params` in Next.js 16 App Router dynamic pages is a `Promise<{ step: string }>` — must `await params` in the server component
- **Multi-photo upload pattern**: `multiple` attribute on file input + `Array.from(e.target.files ?? [])` + `Promise.all(files.map(async (file) => uploadUrl...))` for parallel uploads. Reset input value after each selection so user can add more photos incrementally.

---

## 2026-02-18 - US-030
- Added `pets` table to `convex/schema.ts` with all required fields: propertyId, name, species, optional text fields (breed, age, feedingInstructions, vetName, vetPhone, personalityNotes, medicalConditions, behavioralQuirks, allergies, microchipNumber, insuranceInfo, walkingRoutine, groomingNeeds, comfortItems), photos array (`v.array(v.id("_storage"))`), medications array of objects, sortOrder; `by_property_sort` compound index on [propertyId, sortOrder]
- Created `convex/pets.ts` with `create`, `getPetsByPropertyId`, `update`, `remove` mutations/queries following established CRUD pattern
- Re-ran `node_modules/.bin/convex codegen --system-udfs --typecheck disable`
- **Files changed:** `convex/schema.ts`, `convex/pets.ts`, `convex/_generated/*`
- **Learnings:**
  - Reusable validator constant (`const medicationObject = v.object({...})`) can be shared between `create` args, `update` args, and the `petObject` returns validator — avoids duplication and keeps the schema shape in sync
  - For complex nested object arrays in Convex, define the sub-object validator as a `const` and reference it in all three places: schema definition, create args, and returns validator
---

## 2026-02-18 - US-028
- Implemented wizard step 3 "Add access info (vault items)" at `/wizard/3`
- **Files changed:**
  - `convex/schema.ts` — Added `vaultItems` table with `type` as `v.union` of 7 literals (`door_code`, `alarm_code`, `wifi`, `gate_code`, `garage_code`, `safe_combination`, `custom`), `label`, `value`, `instructions`, `sortOrder`; `by_property_sort` compound index
  - `convex/vaultItems.ts` (new) — `create`, `listByPropertyId`, `update`, `remove` mutations/queries following established CRUD pattern; shared `vaultItemType` validator reused across `create`, `update`, and `vaultItemObject` returns validator
  - `convex/_generated/*` — Re-run codegen
  - `src/app/wizard/[step]/Step3Access.tsx` (new) — 7-type icon-grid selector (Door/Alarm/WiFi/Gate/Garage/Safe/Custom SVG icons); `MaskedInput` component with eye-toggle (show/hide); `SavedVaultItem` card showing masked value + toggle + delete; `VaultForm` with validation; `Step3Access` main component following Step2Pets pattern
  - `src/app/wizard/[step]/WizardStepInner.tsx` — Added Step3Access import + routing for `step === 3`
- **Learnings:**
  - **Masked input with toggle**: A flex wrapper div with `focus-within:border-primary` on the container (not the input) + border-l between input and eye button — avoids absolute positioning and focus-ring edge cases
  - **Type selector icon-grid**: `aria-pressed` attribute gives accessible state to type selector buttons; `border-[1.5px]` on inputs vs `border` on cards — consistent with design system rules
  - **Label pre-fill logic**: Check if label matches ANY type's default label before replacing (not just empty) — so switching from Door to WiFi correctly updates the pre-fill even if user hasn't edited it
  - **Snapshot refs change on re-render**: After a React state change, aria snapshot refs are invalidated — always call `getAISnapshot()` again before `selectSnapshotRef()` when the page has re-rendered; OR use `page.click('button:has-text("...")')` for stable selectors
---

## 2026-02-18 - US-029
- Implemented wizard step 4 "Emergency contacts" at `/wizard/4`
- **Files changed:**
  - `convex/schema.ts` — Added `emergencyContacts` table with `propertyId`, `name`, `role`, `phone`, `notes` (optional), `sortOrder`, `isLocked`; `by_property_sort` compound index
  - `convex/emergencyContacts.ts` (new) — `create`, `listByPropertyId`, `update`, `remove` mutations/queries; `reorderContacts` mutation accepting `{ id, sortOrder }[]` array for bulk sort update; `seedDefaults` mutation that checks for existing contacts before inserting ASPCA + 4 default slots
  - `convex/_generated/*` — Re-run codegen
  - `src/app/wizard/[step]/Step4Contacts.tsx` (new) — `LockedContactCard` for ASPCA (read-only, lock icon, tap-to-call link); `EditableContactCard` with inline Name/Role/Phone/Notes inputs, up/down arrows, delete, explicit "Save contact" button; `Step4Contacts` main component with seeding logic, reorder handlers, "Add another" button
  - `src/app/wizard/[step]/WizardStepInner.tsx` — Added Step4Contacts import + routing for `step === 4`
- **Learnings:**
  - **`react-hooks/set-state-in-effect` guard**: Use `useRef` instead of `useState` for one-shot trigger flags (like `seededRef.current = true`) — refs mutate without causing re-renders and are not subject to the setState-in-effect lint rule
  - **Seeding idempotency**: `seedDefaults` mutation checks for existing records before inserting (`ctx.db.query(...).first()`) — safe to call multiple times; the `seededRef` guard in the component prevents redundant calls during the same session
  - **Inline editable cards**: `useEffect` that only runs on `contact._id` change (not every prop update) lets the form maintain local edits without being overwritten by Convex real-time updates; `isDirty` computed with `.trim()` comparison handles whitespace differences between form and Convex state
  - **Up/down reorder canMoveUp logic**: `canMoveUp = index > 0 && !contacts[index - 1].isLocked` — prevents any contact from moving above the locked ASPCA slot without special-casing ASPCA itself
  - **Unique Input IDs across repeated cards**: Pass `id={`${contact._id}-fieldname`}` to override the Input component's auto-derived id (from label) — prevents duplicate `id` attributes in the DOM when multiple cards share the same field labels
---

## 2026-02-18 - US-027
- Implemented wizard step 2 "Add your pets" at `/wizard/2`
- **Files changed:**
  - `src/app/wizard/[step]/Step2Pets.tsx` (new) — full pet form with required/optional fields, multi-photo upload thumbnail grid, collapsible "More details" section, medications sub-form with add/remove rows, real-time pet list via Convex query, `SavedPetCard` subcomponent resolving storage URLs
  - `src/app/wizard/[step]/WizardStepInner.tsx` — added `Step2Pets` import + routing for `step === 2`
- **Learnings:**
  - `Doc<"tablename">` IS exported from `convex/_generated/dataModel` alongside `Id` — use `import type { Id, Doc } from "../../../../convex/_generated/dataModel"` for Convex document typing in components
  - Split form into a separate `PetForm` component and a `SavedPetCard` component for clean separation. `SavedPetCard` calls `useQuery(api.storage.getUrl, ...)` with "skip" pattern — this is valid inside a dedicated component since hooks don't change between renders
  - Multi-photo grid: track `photoFiles: File[]` and `photoPreviews: string[]` in parallel arrays by index. Use `URL.createObjectURL` for previews, `URL.revokeObjectURL` on removal. Reset file input value after each selection so the same file can be re-selected after removal
  - Collapsible "More details" section: `useState(false)` + chevron icon with CSS `rotate` transition — no external library needed
  - Medications sub-form: array of `MedicationRow` objects in form state; `addMedication`/`removeMedication`/`updateMedication` handlers with index-based updates. Use compact inline `<input>` elements (not `<Input>` wrapper) in a 2-column grid for compact medication rows
  - `propertyId` chain: session token → `validateSession` → userId → `listByOwner` → `properties[0]._id`. Each step uses "skip" pattern when previous step's result is undefined
  - "Property not found" error appears correctly in browser when no Convex backend is running — the guard condition `if (!propertyId)` works as expected
---

## 2026-02-18 - US-031
- Implemented wizard step 5 "House instructions by section" at `/wizard/5`
- **Files changed:**
  - `convex/sections.ts` — Updated `remove` mutation to cascade-delete all instructions before deleting the section
  - `convex/instructions.ts` — Added `reorderInstructions` mutation (bulk sortOrder swap, same pattern as `reorderContacts`)
  - `convex/_generated/*` — Re-run codegen
  - `src/app/wizard/[step]/Step5Sections.tsx` (new) — `InstructionRow` (text textarea with on-blur save, time slot select with `bg-accent-light text-accent` styling, proof toggle, `+ Photo card` placeholder button); `SectionPanel` (expandable with icon/title header, instruction CRUD, up/down reorder); `CustomSectionForm` (title input + 12-emoji icon picker grid); `Step5Sections` main component with 2-column prebuilt checkbox grid + sections panels
  - `src/app/wizard/[step]/WizardStepInner.tsx` — Added Step5Sections import + routing for `step === 5`
- **Learnings:**
  - **`react-hooks/set-state-in-effect` vs `key` prop reset**: Avoid `useEffect(() => { setState(prop); }, [prop._id])` — the lint rule `react-hooks/set-state-in-effect` blocks synchronous setState in effects. Use `key={item._id}` on the parent render instead — React remounts the child on key change, automatically resetting `useState(initialValue)` from props. This is cleaner and avoids the lint error entirely.
  - **Section toggle = create/delete pattern**: No `isEnabled` field needed in schema. Checked sections exist in DB; unchecked = deleted (with cascade). Derive checkbox state from `Set(sections.map(s => s.title))`. Pre-built sort orders (0-7), custom sections (100+).
  - **Cascade delete in Convex**: Fetch child records with the relevant index, loop `ctx.db.delete()` for each, then delete parent. No foreign key cascade support in Convex — must do it manually in the mutation handler.
  - **Section panels per-query pattern**: Each `SectionPanel` independently calls `useQuery(api.instructions.listBySection, { sectionId })` — 0-8 concurrent Convex queries is fine and gives per-section real-time updates without a parent-level join.
  - **Custom section sortOrder**: Use `Math.max(maxExistingSortOrder + 1, 100)` to place custom sections after all pre-built sections (0-7) in the sort order.
---

## 2026-02-18 - US-032
- Implemented wizard step 6 "Review & publish" at `/wizard/6`
- **Files changed:**
  - `convex/schema.ts` — Added `status: v.optional(v.union(v.literal("draft"), v.literal("published")))` to `properties` table
  - `convex/properties.ts` — Added `statusValidator` const; updated `propertyObject` to include `status`; added `getManualSummary` query (counts pets/vault/contacts/sections/instructions + completeness flags) and `publishManual` mutation (patches status to `"published"`)
  - `convex/_generated/*` — Re-run codegen
  - `src/app/wizard/[step]/Step6Review.tsx` (new) — Summary checklist with 5 rows (property, pets, access, contacts, instructions), each with status badge (`bg-secondary-light text-secondary` for complete, `bg-warning-light text-warning` for incomplete) and ghost Edit link to the relevant wizard step; scrollable read-only sitter preview pane (`ManualPreview` + `PreviewSectionInstructions` sub-components); disabled Publish button until property name set; `publishManual` mutation then `router.push("/dashboard")`
  - `src/app/wizard/[step]/WizardStepInner.tsx` — Added `Step6Review` import and `step === 6` routing
- **Learnings:**
  - **Cross-table aggregation in Convex query**: `getManualSummary` sequentially queries 4 tables + loops sections to count instructions — totally fine for Convex, no N+1 penalty concern at this scale. Pattern: `for (const section of sections) { const insts = await ctx.db.query(...).collect(); count += insts.length; }`
  - **Optional status field on existing table**: Adding `v.optional(v.union(v.literal("draft"), v.literal("published")))` to the schema is backward-compatible — existing documents without the field still pass validation; `undefined` = implicitly draft
  - **Shared validator constant for union types**: Define `const statusValidator = v.optional(v.union(...))` once and reference it in both `propertyObject` (returns validator) and `getManualSummary` return type — keeps shape in sync without duplication
  - **Read-only preview sub-components**: Each sub-component (`PreviewSectionInstructions`) independently calls `useQuery` — same per-query pattern as `SectionPanel` in Step5. The component tree still renders correctly when parent has no data yet.
---

## 2026-02-18 - US-033
- Implemented standalone sections editor at `/dashboard/property/sections`
- **Files changed:**
  - `convex/sections.ts` — Added `reorderSections` mutation (batch sortOrder patch, same pattern as `reorderInstructions`)
  - `convex/_generated/*` — Re-run codegen
  - `src/app/dashboard/property/sections/page.tsx` (new) — Server component with `metadata.title = "Edit Sections | Handoff"`; renders `SectionsEditorPageClient`
  - `src/app/dashboard/property/sections/SectionsEditorPageClient.tsx` (new) — `"use client"` wrapper doing `dynamic(() => import("./SectionsEditor"), { ssr: false })` (required because SectionsEditor reads localStorage via `useAuth`)
  - `src/app/dashboard/property/sections/SectionsEditor.tsx` (new) — Full editor component: `InstructionRow` (same as wizard, blur-saves text, time slot select, proof toggle, `+ Photo card` placeholder); `SectionEditPanel` (section-level up/down reorder arrows, inline title/icon edit form with 20-icon picker, inline delete confirmation as `bg-danger-light` panel inside card); `CustomSectionForm`; main `SectionsEditor` with auth guard, CreatorLayout, back link, "no property" empty state, loading skeleton, active sections list, prebuilt/custom add section area
  - `src/app/dashboard/page.tsx` — Added `Link` import and `"Edit sections →"` link in the "My Property" section header pointing to `/dashboard/property/sections`
- **Learnings:**
  - **Inline delete confirmation pattern**: Use a `showDeleteConfirm: boolean` state flag. When true, render a `bg-danger-light` panel as a sibling to the header (but within the same card), with "Are you sure?" text plus Cancel/Delete buttons. No modal needed — keeps the interaction within the card.
  - **Inline title/icon edit pattern**: Use `isEditing: boolean` state. When true, replace the header icon+title with an input field and icon picker grid. On save call the `update` mutation; on cancel reset local state to `section.title`/`section.icon`. The edit form renders inside the header `div` using flex.
  - **Section-level reorder**: Same swap pattern as instruction reorder — store `prev` and `curr` sortOrders, swap them in a `reorderSections({ updates: [{id, sortOrder}] })` batch mutation. Always derive sort from the live query result array, not from local state.
  - **Sub-page with CreatorLayout**: For sub-pages under dashboard, pass `activeNav="property"` and `onNavChange={() => router.push("/dashboard")}` to CreatorLayout so sidebar nav items navigate back to dashboard (since this is a dedicated page, not the in-app tab switcher pattern of the dashboard).
  - **3-file auth page pattern**: page.tsx (server, metadata) → `*PageClient.tsx` ("use client", `dynamic(ssr:false)`) → main component. The ssr:false is required whenever the component uses `useAuth()` which reads localStorage.
---

## 2026-02-18 - US-034
- Added `reorderPets` batch mutation to `convex/pets.ts` accepting `[{petId, sortOrder}]` array
- Created `src/app/dashboard/property/pets/page.tsx` (server wrapper with metadata)
- Created `src/app/dashboard/property/pets/PetsEditorPageClient.tsx` (dynamic import, ssr:false)
- Created `src/app/dashboard/property/pets/PetsEditor.tsx` (full client editor)
  - Queries pets by propertyId, shows each as PetProfileCard with Edit/Delete/Up/Down actions
  - Edit button expands inline PetForm pre-populated from pet doc; Cancel collapses
  - PetForm handles both add (blank) and edit (pre-filled) modes via `initialValues` + `existingPhotoIds`
  - Existing photos shown as thumbnails with delete buttons; new photos uploadable via file input
  - Delete confirmation renders inline within pet card using `bg-danger-light`
  - Reorder swaps sortOrder between adjacent pets via reorderPets mutation
  - `showMoreDetails` auto-expands when editing a pet that has any optional fields filled
- Updated `src/app/dashboard/page.tsx` My Property section: split "Edit sections →" into "Pets →" and "Sections →" links
- **Learnings:**
  - `// eslint-disable-next-line react-hooks/set-state-in-effect` in useEffect triggers "unused directive" warning when the rule doesn't actually fire — just omit the comment (no real error is suppressed in this file)
  - For `onSave` callbacks where the parent doesn't need a parameter (e.g., `keptPhotoIds` for new pet creation), simply omit the trailing param from the arrow function — TypeScript allows functions with fewer params to satisfy types expecting more
  - `PetForm` auto-expands "Add more details" section when `initialValues` has any optional fields filled: good UX for edit mode
  - ExistingPhotoThumb as a separate component (one per photo ID) cleanly handles per-photo useQuery hooks
---

## 2026-02-18 - US-035
- Implemented full-text search across the sitter-side manual view
- **Files changed:**
  - `convex/schema.ts` — Added search indexes: `search_title` on `manualSections.title` (filterField: propertyId), `search_text` on `instructions.text`, `search_name` on `pets.name` (filterField: propertyId), `search_feeding` on `pets.feedingInstructions` (filterField: propertyId), `search_caption` on `locationCards.caption`
  - `convex/search.ts` (new) — `searchManual` query: searches instructions (joins to section for propertyId filter), section titles, pet names, pet feeding instructions, location card captions; returns `SearchResult[]` with type/id/snippet/sectionName/sectionId/propertyId
  - `convex/_generated/*` — Re-run codegen
  - `src/app/manual/[propertyId]/page.tsx` (new) — Server component with metadata
  - `src/app/manual/[propertyId]/ManualPageClient.tsx` (new) — `"use client"` + `dynamic(() => import("./ManualView"), { ssr: false })` wrapper + Convex env guard
  - `src/app/manual/[propertyId]/ManualView.tsx` (new) — Full sitter manual view: SearchBar (300ms debounce, URL sync via replaceState/pushState, popstate restore), SectionNav tabs, SectionInstructions per-section with instruction highlight, client-side offline fallback search via useMemo + cached instructions state, Convex `searchManual` query, ResultRow with bolded match text, EmptyState
- **Learnings:**
  - **Convex full-text search API**: Use `ctx.db.query("table").withSearchIndex("indexName", (q) => q.search("field", query).eq("filterField", value)).take(n)` — NOT `ctx.db.search()` (doesn't exist). The search filter builder supports chaining `.eq()` for filter fields defined in the index.
  - **Convex offline codegen type assertion**: When `ctx.db.get()` is called on a joined record, offline codegen returns union of all table types. Use `as Doc<"tableName"> | null` type assertion to narrow to the specific table type.
  - **`react-hooks/set-state-in-effect` fix patterns**:
    1. For state derived from a query: use `useMemo` instead of `useEffect + setState` (e.g., `cachedSections = useMemo(() => sections?.map(...) ?? [], [sections])`)
    2. For "default active item" pattern: derive `effectiveActiveSection = activeSection || sections?.[0]?._id || ""` instead of `useEffect(() => setActiveSection(...), [sections])`
  - **`react-hooks/refs` fix**: Replace `useRef` cache accessed during render with `useState` + `useMemo` for derived search results — `ref.current` cannot be read during render body per ESLint rule
  - **URL search param persistence**: `window.history.replaceState` for typing updates (no history), `window.history.pushState` when navigating to a result (adds history entry so back restores search), `popstate` listener for browser back support
  - **`convex data <table>`** CLI command lists all documents in a table — useful for getting test IDs during browser verification
---

## 2026-02-18 - US-036
- Implemented manual sitter view with full-page scroll browsing, section navigation, inline location cards, pet profiles, and emergency contacts
- **Files changed:**
  - `convex/manualView.ts` (new) — `getFullManual` query: fetches property + all sections (with nested instructions + location cards) + pets (with resolved photo URLs) + emergency contacts in a single composed query using `Promise.all()` to avoid N+1 patterns. Uses `ctx.storage.getUrl()` to resolve pet photo storage IDs to URLs.
  - `convex/_generated/*` — Re-run codegen
  - `src/app/manual/[propertyId]/ManualView.tsx` — Rewrote from tab-based section view to full-page scroll view: all sections visible simultaneously, `SectionNav` scrolls to sections via `scrollIntoView({ behavior: "smooth", block: "start" })`, inline `LocationCard` thumbnails (horizontal scroll row) per instruction, `PetProfileCard` horizontal scroll row for pets, emergency contact cards with tap-to-call (`tel:` links). Preserved search functionality from US-035 (search shows results panel; browse mode shows full scroll layout). Client-side fallback search now uses `fullManual` data directly instead of separately cached instructions.
  - `src/app/manual/[propertyId]/page.tsx`, `ManualPageClient.tsx` — Unchanged (3-file pattern works)
- **Learnings:**
  - **Convex composed query pattern**: Create a dedicated `convex/manualView.ts` for view-specific queries that aggregate data from multiple tables. Use `Promise.all()` to batch parallel fetches, then build lookups (Map or index matching) to assemble nested structures without N+1.
  - **Convex `v.any()` for returns**: Valid validator for complex nested return types. The Convex dev server auto-deploys on file changes, but may be slow to detect newly created files — run `npx convex dev --once` to force sync if the function doesn't appear after 10+ seconds.
  - **Sticky SectionNav full-bleed pattern**: Use `-mx-4 px-4 md:-mx-6 md:px-6` (negative margin + re-add padding) with `sticky top-0 z-10 bg-bg` to make a sticky nav span full container width while the content stays padded. Matches the parent's responsive padding values.
  - **Scroll-to-section with sticky header**: Use `scroll-mt-24` (96px) on section elements when there's a sticky header, so `scrollIntoView({ block: "start" })` doesn't hide the section header behind the sticky nav.
  - **LocationCard width override**: Pass `className="shrink-0 w-[200px]"` to override the default `w-[280px]` — tailwind-merge in `cn()` resolves the width conflict and the last class wins.
  - **`ctx.storage.getUrl()` in queries**: Available in Convex queries (not just actions). Safe to call in parallel with `Promise.all()` for batch photo URL resolution.
---

## 2026-02-19 - US-037
- Implemented photo upload for location cards: file picker with mobile camera capture, canvas-based image compression (max 1920px wide), preview thumbnail, Convex file storage upload flow, caption field (Caveat font), room tag selector
- **Files changed:**
  - `convex/schema.ts` — Added `storageId: v.optional(v.id("_storage"))` to `locationCards` table
  - `convex/locationCards.ts` — Added `generateUploadUrl` mutation (`ctx.storage.generateUploadUrl()`), added `storageId` to `create`/`update`/`listByParent`
  - `convex/manualView.ts` — Added storageId → URL resolution for location cards using `ctx.storage.getUrl()` in parallel via `Promise.all()`; resolvedUrlByCardId map overrides `photoUrl` for display
  - `src/components/ui/LocationCardUploader.tsx` (new) — Modal component: `<input type='file' accept='image/*' capture='environment'>`, canvas resize to max 1920px wide, object URL thumbnail preview, caption input (font-handwritten), room tag chips (rounded-pill), Convex upload flow (generateUploadUrl → fetch POST → storageId → createLocationCard)
  - `src/app/wizard/[step]/Step5Sections.tsx` — Replaced placeholder "photo card" button with `LocationCardUploader` state + modal render
  - `src/app/dashboard/property/sections/SectionsEditor.tsx` — Same as above
- **Learnings:**
  - **Convex file upload flow**: `generateUploadUrl` is a `mutation` (not an action) that returns a one-time upload URL. Client does `fetch(uploadUrl, { method: "POST", headers: { "Content-Type": "image/jpeg" }, body: blob })`. Response JSON has `{ storageId }`. Then call `createLocationCard` mutation with the storageId.
  - **Canvas image compression**: `new Image()` + `URL.createObjectURL(file)` → canvas `drawImage` → `canvas.toBlob(...)` with `image/jpeg` + quality 0.85. Remember to `URL.revokeObjectURL()` after img loads to avoid memory leaks.
  - **`capture="environment"` attribute**: On mobile browsers, `<input type='file' accept='image/*' capture='environment'>` opens the rear-facing camera directly. Supports both camera capture and photo library fallback on iOS/Android.
  - **sr-only file input pattern**: Use `className="sr-only"` on `<input type='file'>` and trigger it via `ref.current.click()` on a styled button — provides full design control while maintaining native file picker behavior.
  - **Convex storageId type casting**: When passing `storageId` from a JSON response to a Convex mutation expecting `v.id("_storage")`, cast as `Parameters<typeof mutation>[0]["storageId"]` to satisfy TypeScript without hardcoding the string literal type.
---

## 2026-02-19 - US-038
- Implemented video upload for location cards: file picker with mobile camera capture, client-side duration check (max 30s), canvas-based thumbnail generation, dual Convex file storage upload (thumbnail + video), play icon overlay, video playback in fullscreen expand
- **Files changed:**
  - `convex/schema.ts` — Added `videoStorageId: v.optional(v.id("_storage"))` to `locationCards` table (separate from photo `storageId`)
  - `convex/locationCards.ts` — Added `videoStorageId` field to `create`, `update`, and `listByParent` validators
  - `convex/manualView.ts` — Added parallel `videoStorageId` → URL resolution alongside existing photo URL resolution; returns `resolvedVideoUrl` on each card
  - `src/components/ui/LocationCardVideoUploader.tsx` (new) — Modal component: hidden `<input type='file' accept='video/*' capture='environment'>`, `processVideoFile()` function that checks duration via `onloadedmetadata` and generates JPEG thumbnail via `onloadeddata` + canvas `drawImage`, dual parallel upload flow (thumbnail + video), caption field, room tag chips
  - `src/components/ui/LocationCard.tsx` — Added `videoSrc?: string` prop, `PlayIcon` SVG, play icon overlay (when both `src` and `videoSrc` are set), video `<video controls autoPlay>` in fullscreen expand (vs `<img>` for photos); `isClickable` now includes `videoSrc`
  - `src/app/manual/[propertyId]/ManualView.tsx` — Updated `LocationCardData` interface to include `resolvedVideoUrl`; passes `videoSrc={card.resolvedVideoUrl ?? undefined}` to `<LocationCard>`
  - `src/app/wizard/[step]/Step5Sections.tsx` — Added `LocationCardVideoUploader` import + `showVideoUploader` state + `+ Video card` button + modal render in `InstructionRow`
  - `src/app/dashboard/property/sections/SectionsEditor.tsx` — Same video uploader additions as Step5Sections
- **Learnings:**
  - **Dual Convex upload pattern**: Call `generateUploadUrl({})` twice in parallel (`Promise.all`), then `fetch` POST both blobs in parallel. Store thumbnail in `storageId` (existing photo field) and video in `videoStorageId` (new field) — schema-level separation keeps photo and video clearly distinct.
  - **Video thumbnail via `onloadeddata`**: Use `video.onloadeddata` (first frame available, no seek needed) to capture thumbnail. Draw to canvas with `ctx2d.drawImage(video, 0, 0, w, h)`. This avoids `onseeked` not firing at time=0 edge cases that can occur on some mobile browsers.
  - **`settled` flag pattern for video Promise**: When using both `onloadedmetadata` (duration check) and `onloadeddata` (thumbnail), both events can fire; use a `let settled = false` flag to prevent duplicate resolve/reject calls. Set `settled = true` before any resolve/reject call.
  - **Duration validation**: Check `video.duration > MAX_VIDEO_DURATION` in `onloadedmetadata`. Reject the promise with a user-facing error string — this bubbles up to `setError()` in the component and displays in the `role="alert"` div.
  - **Unused ESLint disable comment**: `/* eslint-disable-next-line jsx-a11y/media-has-caption */` before `<video>` causes a lint error ("unused directive") if the `jsx-a11y/media-has-caption` rule isn't active in the project's ESLint config. Simply omit the comment — the `<video>` element with `controls` is acceptable without captions for this use case.
  - **Write tool for large file rewrites**: When an Edit introduces duplicate code (e.g., duplicate function definition from an imprecise `old_string` match), use the Write tool to rewrite the entire file cleanly rather than trying to surgically fix the duplication with another Edit — faster and eliminates cascading issues.
---

## 2026-02-19 - US-039
- Location card sitter view was mostly already implemented by US-036/037/038. Added two missing pieces:
  - `style={{ touchAction: "pinch-zoom" }}` on the full-screen `<img>` in `LocationCard.tsx` to enable native pinch-to-zoom on mobile
  - Updated `public/sw.js` with cache-first strategy for Convex storage image URLs (`*.convex.cloud/api/storage/*`), falling back to network; video requests bypass cache-first and use network-first per Epic 12 strategy
- Files changed:
  - `src/components/ui/LocationCard.tsx` — added `touch-action: pinch-zoom` inline style to full-screen photo img
  - `public/sw.js` — added `isConvexStorageRequest()` helper + cache-first branch for Convex storage image URLs
- **Learnings:**
  - **Pre-existing work check**: Always audit what prior stories already built before implementing. US-036, 037, 038 had already done: inline card rendering, polaroid style, full-screen expand, video controls, horizontal scroll. US-039 only needed the two incremental additions.
  - **`touch-action: pinch-zoom` for mobile pinch-zoom**: Adding `style={{ touchAction: "pinch-zoom" }}` as an inline React style enables native browser pinch-to-zoom on the img inside a fullscreen overlay. Without it, touch events may be consumed by the scroll container.
  - **Service worker cache-first for images**: `isConvexStorageRequest()` checks `url.hostname.endsWith(".convex.cloud")` + `url.pathname.startsWith("/api/storage/")`. The `Accept` header differentiates image vs video fetches (`video/*` bypasses cache-first). Cache-first: check `caches.match()` first, only `fetch()` if miss, then `cache.put()` the response.
  - **Confirmed `touch-action` via `window.getComputedStyle(img).touchAction`** in browser: returns `"pinch-zoom"` confirming the style applies correctly.
---

## 2026-02-19 - US-040
- Added 4 new tables to `convex/schema.ts`: `trips`, `sitters`, `overlayItems`, `taskCompletions`
- Created `convex/trips.ts` — create, listByProperty, getActiveTripForProperty, update, remove; `by_property_status` index on [propertyId, status]
- Created `convex/sitters.ts` — create, listByTrip, update, remove; `by_trip` index on [tripId]
- Created `convex/overlayItems.ts` — create, listByTrip, listByTripAndDate, update, remove; `by_trip_date` index on [tripId, date]
- Created `convex/taskCompletions.ts` — create, listByTrip, getByTripAndTaskRef, update, remove; `by_trip_taskref` index on [tripId, taskRef]
- Re-ran codegen; typecheck, lint, and build all pass
- **Learnings:**
  - **Trip schema**: `shareLink`, `linkPassword`, `linkExpiry` are all optional since trips may be created before sharing is configured. `status` uses the 4-literal union pattern from the task spec.
  - **taskRef as v.string()**: Like `parentId` for location cards, `taskRef` is a polymorphic reference (can be an instructionId for recurring tasks or an overlayItemId for overlay tasks) — use `v.string()` not `v.id("tablename")` and pair with `taskType` discriminant.
  - **Compound index for deduplication**: `by_trip_taskref` on [tripId, taskRef] enables `getByTripAndTaskRef` query for idempotent task completion checks.
  - **Shared validator constants**: Define `tripStatusValidator`, `timeSlotValidator`, `taskTypeValidator` as module-level consts and reuse in args, update args, and returns validators to keep shape in sync without duplication.
---

## 2026-02-19 - US-042
- Implemented full overlay items step at `/trip/[tripId]/overlay`
- **Files changed:**
  - `convex/schema.ts` — Made `overlayItems.date` optional (`v.optional(v.string())`); added `v.literal("overlayItem")` to `locationCards.parentType` union so location cards can be attached to overlay items
  - `convex/overlayItems.ts` — Updated `overlayItemObject` and `create` args to use `date: v.optional(v.string())`
  - `convex/locationCards.ts` — Added `v.literal("overlayItem")` to `parentTypeValidator` to keep in sync with schema
  - `src/components/ui/LocationCardUploader.tsx` — Added `"overlayItem"` to `parentType` prop union
  - `src/app/trip/[tripId]/overlay/page.tsx` — Replaced placeholder with server component wrapper (metadata + renders OverlayPageClient)
  - `src/app/trip/[tripId]/overlay/OverlayPageClient.tsx` (new) — `"use client"` + `dynamic(ssr:false)` wrapper following 3-file pattern
  - `src/app/trip/[tripId]/overlay/OverlayStepInner.tsx` (new) — Full implementation: env guard, Convex hooks, suggestion chips, add form (text/date/time slot/proof toggle), saved items list with amber badges, "Attach location card" button per item using LocationCardUploader, Skip/Continue navigation
- **Learnings:**
  - **5-level relative path for trip overlay**: Files at `src/app/trip/[tripId]/overlay/` need `../../../../../convex/_generated/api` (5 `../`) not 4 — one level deeper than `src/app/wizard/[step]/`
  - **Convex `parentTypeValidator` must match schema**: When adding a new literal to the schema's union, must also update the corresponding validator const in the functions file (`locationCards.ts` had its own `parentTypeValidator` separate from the schema) — otherwise typecheck fails with "Two different types with this name exist"
  - **Optional index field behavior**: Making `overlayItems.date` optional means items without a date are excluded from `listByTripAndDate` queries (filtered by date) but appear in `listByTrip` — correct behavior for "applies all days" items
  - **Skip vs Continue UX**: When items exist, show "Skip for now" (left, muted) + "Continue →" (right, primary). When no items, show "Skip →" only. Verified in browser both paths navigate to `/trip/${tripId}/sitters`
---

## 2026-02-19 - US-043
- Implemented sitter management step in trip setup flow
- Files changed:
  - `convex/sitters.ts` — added US phone validation regex in `create` and `update` mutations; throws ConvexError string on invalid format
  - `src/app/trip/[tripId]/sitters/page.tsx` — server component with metadata
  - `src/app/trip/[tripId]/sitters/SittersPageClient.tsx` — `"use client"` wrapper with `dynamic(ssr:false)`
  - `src/app/trip/[tripId]/sitters/SittersStepInner.tsx` — full sitter UI: add form, sitter cards with edit/remove, inline confirm, vault toggle
- **Learnings:**
  - `ConvexError("string")` sets `err.message` to the string directly — use string args for user-facing errors caught with `err instanceof Error ? err.message : ...`
  - Vault toggle uses `bg-secondary` (sage green) for active state per design system
  - Inline confirm prompt (state-based "Remove? Yes No") is cleaner than `window.confirm` for mobile UX
  - Client-side phone validation runs before Convex mutation to give immediate feedback; server also validates as defense-in-depth
---

## 2026-02-19 - US-044
- Implemented proof settings step at `/trip/[tripId]/proof`
- **Files changed:**
  - `convex/proof.ts` (new) — `getTasksForTrip` query: traverses trip → property → manualSections → recurring instructions + overlayItems; returns unified task list with `{id, text, timeSlot, proofRequired, type, sectionTitle?}`
  - `convex/_generated/*` — Re-run codegen
  - `src/app/trip/[tripId]/proof/page.tsx` (new) — server component with metadata
  - `src/app/trip/[tripId]/proof/ProofPageClient.tsx` (new) — `"use client"` wrapper with `dynamic(ssr:false)`
  - `src/app/trip/[tripId]/proof/ProofStepInner.tsx` (new) — full proof UI: tasks grouped by time slot (Morning/Afternoon/Evening/Anytime), toggle per task (secondary green on-state), running proof count + "We suggest 1–3 proof items per day" hint, accent badge for overlay items, Continue → `/trip/[tripId]/share`
- **Learnings:**
  - **Cross-table join query in Convex**: `getTasksForTrip` does trip → property → sections → instructions traversal using sequential `for` loops — same cross-table aggregation pattern as `getManualSummary`. No performance concern at scale for Convex.
  - **Unified task list discriminant**: Use `type: "recurring" | "overlay"` field with corresponding `id: v.string()` (not `v.id("tableName")`) for polymorphic task references — then cast back to specific ID type when calling update mutations
  - **Proof toggle color**: Uses `bg-secondary` (sage green) for on-state per design system — same as vault toggle, consistent pattern for all boolean toggles
  - **`sectionTitle: v.optional(v.string())`**: Convex requires `v.optional()` for fields that may be undefined; can't use TypeScript `undefined` directly in return validator
---

## 2026-02-19 - US-045
- Implemented trip auto-expiration via scheduled Convex cron + lazy query check
- **Files changed:**
  - `convex/schema.ts` — Added `activityLog` table with `tripId`, `propertyId`, `event` (string), `createdAt`; indexes `by_trip` and `by_property`
  - `convex/trips.ts` — Added `internalMutation` import; updated `getActiveTripForProperty` with lazy expiration check (returns null if `trip.endDate < today` even before cron updates DB); added `expireTripInternal` internal mutation (single-trip expiration: patch status to 'expired', revoke sitters' vaultAccess, insert activityLog event); added `expireTripsDaily` internal mutation (full table scan for active trips with endDate < today, expires each)
  - `convex/crons.ts` (new) — Daily cron at midnight UTC calling `internal.trips.expireTripsDaily`
  - `convex/_generated/*` — Re-run codegen
- **Learnings:**
  - **Convex crons setup**: Create `convex/crons.ts` exporting a default `cronJobs()` instance. Use `crons.daily("name", { hourUTC, minuteUTC }, internal.module.functionName)`. The referenced function must be an `internalMutation` (or action) exported from its module.
  - **`internalMutation` import**: Import from `./_generated/server` alongside `mutation` and `query`. Internal mutations are callable from crons and actions but NOT from client-side code or other mutations directly.
  - **Lazy expiration in queries**: Convex queries are read-only — they cannot call mutations. For "on-access expiration", return null when `trip.endDate < today` in the query. The cron handles the actual DB update. This gives clients immediate correct behavior without waiting for the cron.
  - **Full table scan in batch cron**: No index on just `status` — must use `.filter()` on the full `trips` table. Acceptable for a daily batch job; the table won't be large at this scale.
  - **Shared expiration logic**: Chose to duplicate the ~12-line expiration logic between `expireTripInternal` (single-trip) and `expireTripsDaily` (batch) rather than using a helper, because Convex mutations can't call other mutations via `ctx.runMutation` (that's only for actions). Mutations can't share logic through a helper without importing `MutationCtx` from generated types.
  - **`activityLog` event pattern**: Minimal schema — just `tripId`, `propertyId`, `event` string, `createdAt` timestamp. Future activity feed UI (epic-10) will query by `by_property` index to show owner's activity timeline.
---

## 2026-02-19 - US-046
- Implemented Today View — sitter landing page at `/t/[tripId]`
- **Files changed:**
  - `convex/todayView.ts` (new) — `getTodayTasks` composed query: takes `tripId` + `today` date string; fetches trip, property, sitters, emergencyContacts, manualSections, and all recurring instructions in parallel; filters overlayItems to those where `date === today` OR `date === undefined` (everyday tasks); builds tomorrowOverlayItems for the preview section; returns all completions for the trip (client filters by taskRef)
  - `src/app/t/[tripId]/page.tsx` (new) — server component with `metadata.title = "Today | Handoff"`; accepts `params: Promise<{ tripId: string }>` and renders `TodayPageClient`
  - `src/app/t/[tripId]/TodayPageClient.tsx` (new) — `"use client"` wrapper with `dynamic(ssr:false)`; includes `TodayErrorBoundary` (class component) to catch Convex arg validation errors for malformed IDs, showing friendly "Trip not found" state
  - `src/app/t/[tripId]/TodayPageInner.tsx` (new) — full Today View: uses `SitterLayout` with `activeTab="today"`; renders `TodayViewHeader` with sitter name (first registered sitter or "there"), day X of Y, task summary stats; `EmergencyContactBar` (skips locked contacts); time-slotted task list (Morning/Afternoon/Evening/Anytime) with `TimeSlotDivider` and `TaskItem` components; overlay badge on trip-specific tasks; `TomorrowPreview` collapsed section using `bg-bg-sunken rounded-lg`; task toggle calls `taskCompletions.create`/`remove` mutations
  - `src/components/ui/TodayViewHeader.tsx` — Added `italic` class to greeting h1 (`font-display italic text-3xl`)
  - `convex/_generated/*` — Re-run codegen
- **Learnings:**
  - **React Error Boundary for Convex query failures**: Convex validates args client-side for `v.id("tableName")` fields — passing a malformed string throws synchronously, crashing the component. Wrap in a class-based Error Boundary (`getDerivedStateFromError`) to catch this and show a friendly "Trip not found" state instead of a white screen.
  - **taskRef date-scoped convention**: Recurring tasks use `recurring:{instructionId}:{date}` as taskRef (resets daily). Overlay tasks use `overlay:{overlayItemId}` (one-time completion). This lets the UI check completion state without querying per task — just build a `Map<taskRef, completionId>` from all trip completions.
  - **Overlay item "applies every day" pattern**: `date === undefined` in an overlay item means "applies to every day of the trip". Filter includes both `item.date === today` and `item.date === undefined`. Similar for tomorrow preview.
  - **en-CA locale for YYYY-MM-DD dates**: `new Date().toLocaleDateString("en-CA")` returns `YYYY-MM-DD` format in the user's local timezone — more accurate than `.toISOString().split("T")[0]` which gives UTC date (could be wrong for timezones ahead of UTC in the evening).
  - **Loading skeleton outside SitterLayout**: The loading skeleton (`data === undefined`) renders without `SitterLayout` so the page can fill full screen during load without nav flicker. Once data loads, `SitterLayout` renders with bottom nav.
  - **`Date.UTC` for trip day calculations**: Split YYYY-MM-DD strings into `[year, month-1, day]` and use `Date.UTC(y, m-1, d)` for date arithmetic — avoids timezone-dependent `new Date("YYYY-MM-DD")` parsing which treats the string as UTC midnight but local `new Date()` as local time.
---

## 2026-02-19 - US-047
- Added `date: v.string()` field (YYYY-MM-DD) to `taskCompletions` schema for per-day grouping
- Added `by_trip_date` index on `["tripId", "date"]` for efficient per-day completion queries
- Updated `taskCompletions.ts`: added `date` field to `taskCompletionObject` validator and `create` mutation args
- Updated `todayView.ts`: changed completions query to use `by_trip_date` index filtering by `date === today` (implicit daily reset — no delete logic needed)
- Updated `TodayPageInner.tsx`: passes `date: today` when calling `createCompletion`; added `today` to `useCallback` dependency array
- Added `src/__tests__/taskReset.test.ts`: plain TypeScript unit tests covering the three key scenarios
- Files changed: `convex/schema.ts`, `convex/taskCompletions.ts`, `convex/todayView.ts`, `src/app/t/[tripId]/TodayPageInner.tsx`, `src/__tests__/taskReset.test.ts`
- **Learnings:**
  - **Implicit daily reset via query design**: No cron job or delete mutation needed — storing `date: YYYY-MM-DD` on completions and querying by `date === today` naturally yields an empty checklist each morning. The `by_trip_date` index makes this O(1) per trip per day.
  - **Dual date-scoping for recurring tasks**: Recurring tasks are already scoped by date in the `taskRef` (`recurring:{id}:{date}`), so a daily reset would work even without the `date` field. But the `date` field is needed for trip reports (US-076) to group completions by day efficiently.
  - **Overlay item date filtering is lossless**: Past-dated overlay items are still stored in the DB (for trip reports), they just don't appear in the filtered Today View query. No data is deleted.
  - **`useCallback` + stable computed values**: `today` is a stable string computed once per render, but ESLint's `react-hooks/exhaustive-deps` still requires it in the dependency array. Always add computed stable values that are used inside callbacks to the dep array.
---

## 2026-02-19 - US-048
- Implemented vault data model and encryption infrastructure
- **Schema changes** (`convex/schema.ts`): Renamed `type`→`itemType`, `value`→`encryptedValue`, added `locationCardId: v.optional(v.id("locationCards"))` to `vaultItems` table
- **`convex/vaultItems.ts`**: Removed public `create` mutation; added `_insert` internalMutation, `_getById` internalQuery, `_patchEncrypted` internalMutation; `listByPropertyId` now returns labels-only (explicit field construction, no `encryptedValue`)
- **`convex/vaultActions.ts`** (new): `"use node"` action file with AES-256-GCM encryption via `node:crypto`; `createVaultItem` action (encrypts before storing), `updateVaultItemValue` action (re-encrypts), `getDecryptedVaultItem` action (verifies trip-active + sitter-registered before decrypting); key management strategy documented in file header
- **`convex/trips.ts`**: Added `_getById` internalQuery for vault access control
- **`convex/sitters.ts`**: Added `_getByTripAndPhone` internalQuery for vault access control
- **`convex/_generated/api.d.ts`**: Added `vaultActions` module import so `api.vaultActions.*` and `internal.vaultActions.*` are type-safe
- **`src/app/wizard/[step]/Step3Access.tsx`**: Switched from `useMutation(api.vaultItems.create)` to `useAction(api.vaultActions.createVaultItem)`; updated field names (`type`→`itemType`); removed value display from saved items (value is encrypted, not returned by query)
- Files changed: `convex/schema.ts`, `convex/vaultItems.ts`, `convex/trips.ts`, `convex/sitters.ts`, `convex/_generated/api.d.ts`, `convex/vaultActions.ts` (new), `src/app/wizard/[step]/Step3Access.tsx`
- **Learnings:**
  - **Convex `"use node"` circular reference**: Actions in `"use node"` files with `returns` validators get TS7022 ("implicitly has type 'any' because referenced in its own initializer") if the handler return type is not explicitly annotated. Always add `handler: async (ctx, args): Promise<ReturnType> => {` for actions with complex return types.
  - **Convex query handler type cascade**: Using `Omit<Doc<"tableName">, "field">` via destructuring `({ field: _, ...rest }) => rest` in a query handler causes TypeScript to fail to match the `returns` validator type, making the query's return type `any`. This cascades to ALL consumers including unrelated files via Convex's API type system (affects `Doc<T>` across the entire data model). Fix: use explicit object construction `items.map(item => ({ _id: item._id, field1: item.field1, ... }))` instead of spread+omit.
  - **Adding new Convex module to `_generated/api.d.ts`**: The generated `api.d.ts` must be manually updated when adding a new Convex file (action, mutation, query), since it's committed to the repo and not auto-regenerated. Add `import type * as newModule from "../newModule.js"` and add `newModule: typeof newModule` to the `fullApi` declaration.
---

## 2026-02-19 - US-049
- Implemented vault item create/edit/delete management UI for the creator dashboard
- **New files**:
  - `src/app/dashboard/property/vault/page.tsx` — Server page with metadata
  - `src/app/dashboard/property/vault/VaultEditorPageClient.tsx` — Client `ssr:false` wrapper
  - `src/app/dashboard/property/vault/VaultEditor.tsx` — Full CRUD editor component
- **Modified**: `src/app/dashboard/page.tsx` — Added "Vault →" link in My Property section (vault-colored)
- **VaultEditor features**:
  - Type selector: 7-type icon grid (door, alarm, WiFi, gate, garage, safe, custom) with auto-fill label on type change
  - Value field: `type=password` input with eye toggle using `EyeIcon`/`EyeOffIcon`
  - Edit form: label/type/instructions pre-filled; value starts empty with "leave blank to keep current" semantics; re-encrypts only when new value entered
  - Delete: inline confirmation area with `bg-danger-light text-danger` styling per design spec
  - List view: shows label, type name, ••••••• masked value placeholder
  - Empty state: lock icon with dashed border card
  - Security note banner: vault-styled info card at top of page
- **Auth chain**: useAuth → api.auth.validateSession → api.properties.listByOwner → propertyId → api.vaultItems.listByPropertyId
- **Actions wired**: `api.vaultActions.createVaultItem`, `api.vaultActions.updateVaultItemValue`, `api.vaultItems.update`, `api.vaultItems.remove`
- **Learnings:**
  - **`JSX.Element` vs `ReactElement`**: Avoid `JSX.Element` return type annotations in strict TS projects — use `import { type ReactElement } from "react"` instead to avoid "Cannot find namespace 'JSX'" error.
  - **Value masking UX**: For the creator's vault list, masking with static •••••••• is sufficient — no inline reveal needed since values are encrypted server-side and the creator can see the value during edit (edit form starts empty with "leave blank" hint). This avoids needing a separate creator-decrypt action.
---

## 2026-02-19 - US-050
- Implemented SMS PIN verification flow for sitter vault access
- **New files**:
  - `convex/vaultPins.ts` — Internal mutations/queries for vaultPins table: `_upsert`, `_getByTripAndPhone`, `_incrementAttempt`, `_markVerified`, `_delete`
  - `src/components/ui/PinInput.tsx` — 6-digit OTP input with auto-advance focus, backspace navigation, paste handling
  - `src/app/t/[tripId]/VaultTab.tsx` — Full vault tab with verification gate (phone input → PIN entry → vault revealed), sessionStorage for session persistence
- **Modified files**:
  - `convex/schema.ts` — Added `vaultPins` table with `by_trip_phone` index; fields: tripId, sitterPhone (normalized 10-digit), hashedPin, salt, expiresAt, attemptCount, verified (optional)
  - `convex/sitters.ts` — Added `_listByTrip` internal query (for normalized phone lookup in actions)
  - `convex/vaultActions.ts` — Added `createHash` import; added `normalizePhone`, `hashPin` helpers, `PIN_TTL_MS`, `MAX_PIN_ATTEMPTS` constants; added `sendSmsPin` action (validates sitter, generates 6-digit PIN, hashes + stores, sends via Twilio or logs in dev); added `verifyPin` action (checks expiry/attempts/hash, marks verified on success); updated `getDecryptedVaultItem` to check vaultPins verified session (layer 3 security), added `NOT_VERIFIED` error variant
  - `convex/_generated/api.d.ts` — Added `vaultPins` module import and declaration
  - `src/app/t/[tripId]/TodayPageInner.tsx` — Added tab state management (`activeTab`/`setActiveTab`), imports VaultTab, passes tab props to SitterLayout, conditionally renders VaultTab for vault tab and placeholder for manual/contacts tabs; extracts `property._id` from todayView data for VaultTab
- **Learnings:**
  - **Phone normalization for SMS lookup**: Store normalized 10-digit US numbers in vaultPins for consistent lookup regardless of how the owner/sitter formatted the phone. Use `normalizePhone()` in all action handlers before DB operations. For Twilio, convert to E.164 (`+1xxxxxxxxxx`) at send time.
  - **vaultPins dual-purpose record**: A single `vaultPins` doc transitions from "pending PIN" (hashedPin+salt set, verified=undefined) to "verified session" (verified=true, hashedPin/salt cleared, expiresAt extended 24h) on success. This avoids needing a separate `vaultSessions` table.
  - **`react-hooks/set-state-in-effect` with async Promise chains**: The ESLint rule disallows calling setState synchronously inside effects (even via a function call that does it internally). Fix: use `Promise.all(...).then(results => { setState(...) })` pattern — setState inside `.then()` callbacks is allowed. Also: avoid early synchronous `setPhase()` returns inside the effect body; instead unify all setState calls inside the `.then()`.
  - **Conditional `useQuery` with skip**: Use `useQuery(api.foo.bar, phase === "loading" ? { arg } : "skip")` to skip a Convex query until ready. In VaultTab, vault items list is always loaded (labels only, not sensitive) so no skip needed.
  - **Sitter tab switching in TodayPageInner**: The entire sitter experience lives in TodayPageInner. To add vault/manual/contacts tabs, add `activeTab` state + pass to SitterLayout's `onTabChange`. Conditionally render content per tab. No new routes needed — it's SPA-style in-page tab switching.
---

## 2026-02-19 - US-051
- Implemented vault access for verified sitters with decrypted codes, copy-to-clipboard, location cards, and access-denied states
- **Files changed:**
  - `convex/locationCards.ts` — Added `_getByIdWithUrl` internalQuery: fetches a location card and resolves `storageId`/`videoStorageId` to public URLs via `ctx.storage.getUrl()`
  - `convex/vaultItems.ts` — Added `_listByPropertyFull` internalQuery (all items including `encryptedValue`) and `_logVaultAccess` internalMutation (inserts `vault_accessed` event into `activityLog`)
  - `convex/vaultActions.ts` — Added `getDecryptedVaultItems` (plural) action: single call that does all 3 access checks, decrypts all vault items, resolves location card URLs in parallel, logs vault access, returns typed union
  - `src/components/ui/VaultItem.tsx` — Redesigned "revealed" state to card-like `flex-col` layout: header row (icon + label), code block row (monospace + copy button), instructions below, LocationCard at bottom; added `onCopy`, `copied`, and `locationCard` optional props; locked/hidden states unchanged
  - `src/app/t/[tripId]/VaultTab.tsx` — Replaced N individual `getDecryptedVaultItem` calls with single `getDecryptedVaultItems` call; added `access_denied` phase; `AccessDeniedState` component with vault lock icon for TRIP_INACTIVE/NOT_REGISTERED; updated error messages to spec ("This handoff is not currently active", "You don't have access to secure items"); added `copiedId` state + `handleCopy` using `navigator.clipboard.writeText` + `setTimeout` to clear after 1.5s; VaultItem now receives `onCopy`/`copied`/`locationCard` props
- **Learnings:**
  - **Batch decrypt action pattern**: A `getDecryptedVaultItems` (plural) action that does access checks once + decrypts all items is more efficient and provides better error UX (single typed error vs N possible partial failures) compared to N individual `getDecryptedVaultItem` calls. Use `Promise.all()` for parallel location card fetches within the action.
  - **`ctx.storage.getUrl()` in internalQuery**: Storage URL resolution must happen in a query or mutation, not in a `"use node"` action. The action calls `ctx.runQuery(internal.locationCards._getByIdWithUrl, ...)` to get the resolved URLs — the internal query uses `ctx.storage.getUrl()` cleanly.
  - **VaultItem flex-col revealed state**: When a component needs to expand vertically (to show code block + instructions + location card), change the outer `flex items-center` to `flex flex-col` in the specific state. The locked/hidden states can keep the horizontal layout since they don't have expanded content.
  - **Copy button feedback without useEffect**: Use `handleCopy(id, value)` that calls `navigator.clipboard.writeText(value).then(() => { setCopiedId(id); setTimeout(() => setCopiedId(null), 1500); })` — no useEffect needed, avoids the `react-hooks/set-state-in-effect` lint rule entirely.
  - **Access-denied phase in VaultTab**: Added `access_denied` as a Phase enum value with a `accessDeniedReason` string state. When `getDecryptedVaultItems` returns `TRIP_INACTIVE` or `NOT_REGISTERED`/`VAULT_ACCESS_DENIED`, set both states and render the `AccessDeniedState` component with the vault lock icon and specific message.
  - **internalQuery in api.d.ts**: New internal functions (internalQuery/internalMutation) on existing modules are automatically typed via the `typeof locationCards` / `typeof vaultItems` pattern in `api.d.ts` — no manual api.d.ts update needed for functions on existing modules.
---

## 2026-02-19 - US-052
- Implemented vault access logging with a dedicated `vaultAccessLog` table for per-item audit trail and failed PIN tracking
- **Files changed:**
  - `convex/schema.ts` — Added `vaultAccessLog` table with fields: `tripId`, `vaultItemId` (optional, null for failed PINs), `sitterPhone`, `sitterName` (optional), `accessedAt` (server-side Date.now()), `verified` (boolean); index: `by_trip_accessed` on `[tripId, accessedAt]`
  - `convex/vaultAccessLog.ts` — New module: `logVaultAccess` internalMutation (inserts per-item or per-failed-attempt log entry, accessedAt always server-side); `getVaultAccessLog` query (owner-restricted via userId + trip.propertyId.ownerId ownership check, returns desc by accessedAt)
  - `convex/vaultActions.ts` — `getDecryptedVaultItems`: added `Promise.all(rawItems.map(...))` to log each item individually to `vaultAccessLog` (verified: true), kept existing `_logVaultAccess` for general activityLog; `getDecryptedVaultItem`: added single-item log after successful decryption; `verifyPin`: added log entry on INVALID_PIN (verified: false, no vaultItemId)
  - `convex/_generated/api.d.ts` — Added `vaultAccessLog` module import and declaration in `fullApi`
- **Learnings:**
  - **Separate audit table vs generic activityLog**: When you need per-item granularity (which specific vault item was accessed), create a dedicated audit table with a typed `vaultItemId` field instead of adding freeform strings to a generic event log. The generic `activityLog` can still hold summary events for the activity feed.
  - **Server-side timestamps in Convex**: Always use `Date.now()` inside the internalMutation handler for audit timestamps — never accept client-provided timestamps. This prevents sitters from spoofing accessedAt values by altering their request payload.
  - **Owner auth pattern in Convex queries (custom auth)**: Since the app uses custom token auth (not Convex built-in auth), owner-restricted queries accept `userId: v.id("users")` as an arg, then verify `property.ownerId === args.userId` server-side. Match pattern from `properties.listByOwner`.
  - **Per-item logging with Promise.all**: When logging N items in parallel, use `await Promise.all(rawItems.map((item) => ctx.runMutation(internal.vaultAccessLog.logVaultAccess, {...})))` — this creates N concurrent mutation calls which Convex handles efficiently.
  - **New Convex module in api.d.ts**: Add both the import (`import type * as vaultAccessLog from "../vaultAccessLog.js"`) and the `fullApi` entry (`vaultAccessLog: typeof vaultAccessLog`) in alphabetical order relative to other vault modules.
---
## 2026-02-19 - US-053
- Implemented owner notification on vault access: activity feed logging + push notification scheduling
- **Files changed:**
  - `convex/schema.ts` — Added `sitterName: v.optional(v.string())`, `vaultItemId: v.optional(v.id("vaultItems"))`, `vaultItemLabel: v.optional(v.string())` to `activityLog` table for richer event metadata
  - `convex/activityLog.ts` (new) — `getActivityFeed` public query: fetches newest-first activity events by propertyId (up to 20), uses explicit field construction (no spread/omit)
  - `convex/notifications.ts` (new) — `sendPushNotification` internalAction stub: logs notification to console with userId, tripId, message, and deep-link URL; TODO comment for US-070 real push implementation
  - `convex/vaultAccessLog.ts` — Extended `logVaultAccess` internalMutation: for verified per-item accesses, fetches vault item label + property owner via `ctx.db.get()`, inserts activity log entry with sitterName + vaultItemLabel, schedules `sendPushNotification` via `ctx.scheduler.runAfter(0, ...)`
  - `convex/vaultActions.ts` — Removed the separate `_logVaultAccess` summary call from `getDecryptedVaultItems` (eliminated duplicate activityLog entry; per-item logging in `logVaultAccess` now handles activity feed)
  - `convex/_generated/api.d.ts` — Added `activityLog` and `notifications` module imports + fullApi entries in alphabetical order
  - `src/app/dashboard/page.tsx` — Added `ActivityFeedSectionInner` (Convex hooks + env guard pattern) and `ActivityFeedSection` wrapper; `ActivityFeedSectionInner` queries `api.activityLog.getActivityFeed` using auth chain (token → userId → propertyId); maps `vault_accessed` events to slate dot (`ActivityType: "vault"`); replaced fake hardcoded activity data
- **Learnings:**
  - **Convex mutations can schedule actions**: `ctx.scheduler.runAfter(0, internal.notifications.fn, args)` works in internalMutation handlers — no need to promote to an action just for scheduling. The scheduled function (an internalAction) runs asynchronously after the mutation completes.
  - **Denormalize labels for activity feed**: Store `vaultItemLabel` directly in activityLog at write time rather than doing N vault item lookups at query time. This avoids N+1 queries in the feed query and works even if vault items are later deleted.
  - **`internal` import in mutations**: Import `internal` from `./_generated/api` in any Convex module that needs to reference internal functions (for scheduler or other cross-module calls). Only mutations/queries need `_generated/server`; `_generated/api` provides the function references.
  - **Deduplication with per-item vs summary logging**: When both `logVaultAccess` (per-item) and `_logVaultAccess` (summary) insert to activityLog, the feed gets duplicate `vault_accessed` events. Remove the summary call when per-item entries are sufficient — the feed shows N entries (one per item) which gives the owner the most actionable info (which items were seen).
  - **ActivityFeedSection env-guard pattern**: New components that use Convex hooks inside an existing page follow the outer/inner split: outer checks `process.env.NEXT_PUBLIC_CONVEX_URL` and renders fallback; inner holds all hooks. This matches the `NewTripForm`/`NewTripFormInner` pattern already in the codebase.
---

## 2026-02-19 - US-054
- Implemented vault auto-expiration on trip end — inline lazy expiration check in vault actions
- **Files changed:**
  - `convex/vaultActions.ts` — Added inline expiration check to `sendSmsPin`, `getDecryptedVaultItems`, and `getDecryptedVaultItem`: after the `trip.status !== "active"` check passes, compares `trip.endDate < today` (YYYY-MM-DD string) — if expired but cron hasn't run yet, calls `ctx.runMutation(internal.trips.expireTripInternal, ...)` lazily and returns `TRIP_INACTIVE`
- **What was already in place (no changes needed):**
  - `getDecryptedVaultItems`/`getDecryptedVaultItem`/`sendSmsPin` already check `trip.status !== "active"` → `TRIP_INACTIVE` (from US-051)
  - VaultTab already shows "This handoff is not currently active" + "The trip has ended or hasn't started yet" detail for `TRIP_INACTIVE` (from US-051)
  - Daily cron at midnight UTC runs `expireTripsDaily` (from US-045)
  - `getActiveTripForProperty` already has a lazy expiration check in the public query (from US-045)
- **Learnings:**
  - **Two-layer expiration for actions**: Convex queries are read-only and can't mutate state, so lazy expiration in queries returns null without updating the DB. Actions CAN call `ctx.runMutation`, so they can do a true lazy expire: detect expired trip, call `expireTripInternal`, then return `TRIP_INACTIVE`. This ensures expiration happens even when the cron hasn't run yet.
  - **`"use node"` actions can call internal mutations**: `ctx.runMutation(internal.trips.expireTripInternal, { tripId })` works in `"use node"` action handlers — no need to promote the caller to a different runtime.
  - **String date comparison for YYYY-MM-DD works correctly**: `trip.endDate < today` where both are ISO date strings in `YYYY-MM-DD` format does correct chronological comparison (lexicographic = chronological for this format). Don't use `Date.now()` directly — compare string-to-string.
  - **Most US-054 acceptance criteria were satisfied by prior stories**: The actual implementation gap was only the inline `endDate < today` check in actions. Checking `trip.status !== "active"` alone wouldn't catch the cron gap. Checking `endDate` bridges this window.
---

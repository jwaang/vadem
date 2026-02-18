# Ralph Progress Log

This file tracks progress across iterations. Agents update this file
after each iteration and it's included in prompts for context.

## Codebase Patterns (Study These First)

- **Next.js 16 + ESLint 9 flat config**: Uses `eslint.config.mjs` (not `.eslintrc`). Import `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` as arrays to spread. Add `eslint-config-prettier` last to disable formatting rules.
- **pnpm scripts**: `typecheck` = `tsc --noEmit`, `lint` = `eslint`, `build` = `next build`. All three must pass for every story.
- **Tailwind CSS v4**: Uses `@tailwindcss/postcss` plugin, no `tailwind.config.js` — config is done via CSS `@theme` blocks.
- **Convex codegen without deployment**: Run `npx convex codegen --system-udfs --typecheck disable` to generate `convex/_generated/` without requiring a live Convex deployment. This enables `pnpm build` to pass in CI before a deployment exists.
- **Convex + Next.js SSG**: `ConvexReactClient` constructor throws if URL is empty string. The `ConvexClientProvider` must handle missing `NEXT_PUBLIC_CONVEX_URL` gracefully (skip provider, render children directly) so `next build` can prerender static pages.
- **Convex dev script pattern**: Use `"dev": "npx convex dev --run 'next dev --turbopack'"` to start Convex dev server alongside Next.js in a single command.
- **Design tokens via CSS custom properties + Tailwind v4 `@theme inline`**: All design tokens live in `:root` as CSS custom properties, then mapped into Tailwind via `@theme inline` block in `globals.css`. Use `var(--token-name)` in inline styles and Tailwind utility classes (e.g., `bg-primary`, `shadow-polaroid`, `rounded-lg`) in className.
- **Google Fonts via `next/font/google`**: Use `next/font/google` imports (not `<link>` tags) to avoid `@next/next/no-page-custom-font` lint warning. Each font exports a `variable` CSS property that feeds into the `--font-display`/`--font-body`/`--font-handwritten` tokens.
- **PWA manifest in Next.js 16**: Use `metadata.manifest` for the manifest link, `metadata.appleWebApp` for iOS PWA meta tags, and export a separate `viewport` const for `themeColor` (Next.js 16 splits viewport from metadata).
- **UI components in `src/components/ui/`**: Reusable components live in `src/components/ui/`. Use CSS classes in `globals.css` for complex interactive states (hover shadows, active overlays) and Tailwind utilities for static styles (colors, text, border-radius). Export types alongside components.

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
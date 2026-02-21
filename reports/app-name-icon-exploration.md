# Context: Vadem (formerly “Vadem”) — app naming + icon exploration

## Product (high level)
- Web-first PWA (Next.js + Tailwind v4 + Convex) that lets homeowners create structured, media-rich, searchable care manuals for anyone temporarily caring for their home/property (and initially pets), shared via a single link (no download/no sitter account).
- Sitter experience: “Today View” (time-slotted tasks), searchable full manual, inline Location Cards, optional task check-off + photo proof, emergency tap-to-call.
- Security: Encrypted Vault for credentials (codes/WiFi/etc) gated by phone verification, logged access, time-bounded to trip dates, one-click revoke, auto-expire at trip end.
- Architecture differentiators:
  1) Per-instruction Location Cards (polaroid-style photo/video + caption + room tag) solving “where is it?”
  2) Trip Overlay object with expiration semantics + contextual Today View (relevant-now slicing)
  3) Secure Vault with time-bounded, logged access
  4) Consumer-friendly accountability (check-off + optional proof) + exportable trip report
  5) Long-term: one property → multiple audience views (sitter/guest/cleaner/emergency) for STR expansion

## Design system (key constraints)
- “Warm Editorial”: handwritten care note warmth + cookbook precision.
- Fonts: Instrument Serif (display), Bricolage Grotesque (UI), Caveat (handwritten captions).
- Palette: Terracotta #C2704A (primary), Sage #5E8B6A (success), Amber #D4943A (overlay), Slate #3D4F5F (vault), Linen #FAF6F1 (background) + subtle noise.
- Signature component: Location Card (polaroid-style with Caveat caption, slight tilt, warm shadow).
- Motion: calm; “check pop” spring bounce for task completion; vault reveal deliberate.

## Naming decisions
- Avoid pet-forward name (future STR expansion).
- Avoid generic descriptive names (e.g., “DailyGuide”).
- Prefer short, brandable startup names.
- Chosen name: **Vadem** — from Latin *vademecum* (“go with me” portable handbook).

## Related myth/Latin references considered
- Janus (doors/transitions/time), Cardea (hinge/threshold), Portunus (keys/doors), Vesta (home/hearth), Lares/Penates (household guardians), Limen (threshold), Clavis (key), Custos/Tutela (guard/guardianship), Atrium (home hub).
- Final pick stayed: Vadem (portable manual vibe, link-as-handbook).

## App icon direction (for Vadem)
Goal: icon should be distinctive, warm, editorial; not text-heavy; work at 16–32px; ideally references Location Cards while reflecting “go-with-me” manual + trip overlay + vault.

### Recommended icon concepts (Vadem-specific)
1) **Pocket Guide + Bookmark Tab**
   - Small pocket-book rectangle with an amber bookmark ribbon; optional serif italic “V” deboss.
2) **Serif Italic “V” Monogram**
   - Instrument Serif italic “V” centered on linen, tiny amber dot accent; very scalable.
3) **V-as-Map-Pin**
   - Location pin whose negative space forms a V (terracotta on linen); ties to “where is it?” moat.
4) Folded note card with wax-seal dot containing V (handmade/editorial).
5) Polaroid Location Card silhouette with minimal handwritten “V” stroke in caption area.
6) Stacked polaroids with small amber badge/tab (baseline + overlay).
7) Card + sage checkmark (accountability).
8) Card + slate keyhole tab (vault signal without looking like password manager).
9) Doorway arch framing a V (threshold/access).

### Color guidance for icon
- Background: Linen #FAF6F1 (optionally subtle noise).
- Primary mark: Terracotta #C2704A.
- Accent: Amber #D4943A (sparingly).
- Optional secondary: Sage #5E8B6A for check; Slate #3D4F5F for vault tab.
- Avoid thin strokes and detailed shadows; keep one main symbol + one accent.

## Output needed next
- Continue refining icon concepts into a final 2–3 options with concrete specs:
  - iOS icon (1024), Android adaptive (foreground/background), favicon (32/16).
  - Grid, corner radii, stroke weights, and exact token colors.
  - Simple SVG-ready shapes (no text in most variants; monogram variant allowed).

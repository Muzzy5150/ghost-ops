# Phase 13: local Shopipad reference

Read-only source inspection used the local Shopipad project, never the public website. Verified files and patterns:

- `apps/web/app/page.tsx`: editorial story, numbered sheets, technical captions, opening/closing CTAs.
- `app/globals.css`: lime `#7cff5b`, black `#0a0d0a`, paper `#e9efe6`, mint `#b8ff9f`, muted `#9aa798`; Arial/Helvetica display and system monospace.
- `app/motion.css`: forest `#245d29`, 24px grid, 56px header, 7.78vw gutters, tight oversized type, technical rails/stamps, mobile adaptations.
- `components/shell.tsx`, `nav.tsx`: semantic sections, sticky navigation and responsive menu.
- `components/motion/scroll-story.tsx`, `commerce-agent.tsx`: persistent character, lazy motion import/disposal guard, independent SVG parts.
- `lib/motion/floor-story.ts`: GSAP/ScrollTrigger, responsive matchMedia, measured geometry, smoothstep interpolation, context cleanup.

Ghost Ops adapts this design language to its own security story. No commerce business content, third-party fonts, or Shopipad backend is copied.

## Approved mascot

`design-reference/ghostops-mascot.png` is the unchanged supplied 1254×1254 transparent PNG. Preparation creates a lossless transparent WebP; the original remains the static/reduced-motion fallback. One SVG image definition is clipped into body, two hands, six hem strips, analytics, terminal and sparkles. Pixel geometry overlays expressions. The small SVG logo/favicon reduces the same white silhouette, terminal face and green outline without loading a raster image.

## Motion and hosted boundary

GSAP is lazy-loaded on the homepage. Cached scene measurements feed transforms and scene attributes, without scroll-driven React renders. Triggers and media contexts are reverted on unmount. Reserved illustration lanes prevent content overlap. CSS animates independent hands, pixel-step hem, objects, hover and blinking. Reduced motion uses a static hero mascot.

`/terminal` reuses the authoritative graph, windows, inspectors and recorded adapters; `/demo` retains playback. Shared brand styling also applies to the isolated local workstation. No backend APIs, credentials or privileged actions are added.

## Verification

Website typecheck, lint, static production build, 10 source/artifact tests and 10 Chromium interaction regressions pass. Checks cover navigation/deep links, independent animation tracks, expressions, lifecycle cleanup, reduced motion, transparent lossless assets, initial layout stability, graph selection, window movement/resizing/persistence, engine navigation, memory comparison, playback and disabled authority. Changed files and public build output pass the focused private-material checks.

Rendered browser inspection covers all nine system sheets, hero/final entry, terminal graph and homepage layouts at 1920, 1440, 768 and 390 pixels. The original mascot is preserved; one lossless WebP is shared across SVG clips rather than repeatedly loading raster layers. Preview and Production verification remain release gates.

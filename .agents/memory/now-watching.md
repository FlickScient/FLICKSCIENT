---
name: Now Watching ambient background
description: Poster-palette shimmer ambient background + banner feature wired into App/LibraryPage/MovieDetailModal.
---

Feature lives in `src/components/NowWatching.tsx`:
- `AmbientBackground` — fixed, z:0, 3 animated gradient orbs using RGB values from `extractPosterPalette()`. Rendered in App.tsx wrapping all views.
- `NowWatchingBanner` — collapsible banner above the movie list in LibraryPage. Shows poster, shimmer sweep animation, episode progress bar for series, +1 episode button, play/pause toggle.
- `extractPosterPalette()` — draws the poster onto a 40×60 canvas and samples 3 zone averages (top-left / center / bottom-right), filtering extremes.

**State:** `nowWatchingId` stored in React state + `localStorage` so it persists across page refreshes. Derives `nowWatchingMovie` from `movies` array in App.tsx.

**How to apply:** Set Now Watching via MovieDetailModal "Set as Now Watching" button (Tv2 icon). Clear via banner ✕ or toggle same button again. AmbientBackground animates with `ambientShimmer` + `ambientPulse` keyframes injected via `<style>` tag.

---
name: Component extraction
description: How App.tsx was split into separate page/component files with the existing hash-based routing preserved.
---

App.tsx (2484 lines) was split into:
- `src/lib/constants.ts` — TMDB_GENRES, INDUSTRIES, GENRE_ICONS, LANG_TO_INDUSTRY, genreColor, detectIndustry, TMDB_IMG, tmdb fetch helper
- `src/components/` — StarRating, CircularProgress, MovieSyncLogo, MovieDetailModal, ResultCard, SeedModal, DrawerMenu (+ WelcomeModal named export), BottomNav, BlobIcon (pre-existing), NowWatching
- `src/pages/` — LoginPage, LibraryPage, StatsPage, SearchPage
- `src/App.tsx` — auth state, nowWatchingId, view state, all Supabase data ops, routing render (~210 lines)

**Why:** Monolithic 2484-line file was unmaintainable; split preserves all Supabase auth/data logic in App.tsx.

**How to apply:** Keep hash-based `view` state routing — no react-router or wouter needed. `WelcomeModal` is a named export from `DrawerMenu.tsx`. `MovieDetailSheet` is a named export from `FlickScient.tsx`.

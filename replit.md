# MovieSync (FlickScient)

A cinematic React+Vite movie tracking app — track your personal film canon, get AI film recommendations, and view watch stats with a premium dark-gold UI.

## Run & Operate

- `pnpm --filter @workspace/movie-tracker run dev` — run the app (port 5173); workflow: "FlickScient"
- `pnpm --filter @workspace/movie-tracker run build` — production build

## Stack

- pnpm monorepo, React 19, Vite, Tailwind CSS 4, TypeScript
- Auth + DB: Supabase (auth + Postgres via `supabase.from('movies')`)
- AI: Groq streaming via Supabase Edge Functions
- TMDB API for movie metadata (poster, year, genre)

## Where things live

- Main app: `artifacts/movie-tracker/src/App.tsx` (~2440 lines) — LibraryPage, StatsPage, BottomNav, all UI
- AI chat: `artifacts/movie-tracker/src/FlickScient.tsx` (~1135 lines) — FlickScient AI companion
- Entry HTML: `artifacts/movie-tracker/index.html` — Cinzel font loaded here via Google Fonts
- Logo: `artifacts/movie-tracker/public/favicon.svg`

## Architecture decisions

- All Supabase/TMDB/Groq logic is in App.tsx and FlickScient.tsx — never touch these during UI-only work
- Tailwind v4 cannot set custom fontFamily via class; use `style={{ fontFamily: "'Cinzel', serif" }}` inline
- Design tokens applied inline (not Tailwind) for the gold glow system — see `.agents/memory/design-system.md`

## Product

- Library: track 500+ canonical films across Hollywood, Bollywood, Korean, French cinema etc. Filter by genre, industry, watch status
- FlickScient AI: Groq-powered chat for film recommendations based on mood/vibe
- Stats: watch progress rings, genre/industry breakdowns, achievements, ratings chart

## User preferences

- Premium cinematic UI: Gold `#EAB308`, dark bg `#0a0a0f`, card bg `#0d0d14`, Cinzel serif for headings, Inter for body, gold glowing borders throughout
- ALL Supabase auth/database/API logic must remain untouched during redesigns

## Gotchas

- Always restart the "FlickScient" workflow after code changes
- Screenshot tool needs `port: 5173` explicitly
- Tailwind v4: use inline `style` for Cinzel font, NOT a className

## Pointers

- Design system details: `.agents/memory/design-system.md`

---
name: FlickScient design system
description: Color tokens, font rules, and gold glow patterns used throughout MovieSync (FlickScient).
---

## Tokens
- **Gold**: `#EAB308`
- **Dark bg**: `#0a0a0f`
- **Card bg**: `#0d0d14`
- **Subtle inner bg**: `#1a1a24` / `#1c1c28`
- **Gold border dim**: `rgba(234,179,8,0.08–0.15)`
- **Gold border active**: `rgba(234,179,8,0.3–0.5)`
- **Gold glow shadow**: `0 0 Xpx rgba(234,179,8,Y)` where Y ~0.4–0.6

## Font rule (critical)
Tailwind v4 does NOT support custom fontFamily via utility classes. Always use `style={{ fontFamily: "'Cinzel', serif" }}` inline for Cinzel headings. Cinzel is loaded in `index.html` via Google Fonts.

## Gold glow pattern
Borders and accents use `rgba(234,179,8,...)` with `boxShadow: '0 0 Xpx rgba(234,179,8,Y)'` on hover/active states for the cinematic glow feel.

## DO NOT TOUCH
All Supabase calls (`supabase.auth.*`, `supabase.from(...).*`), TMDB fetch logic, Groq streaming, auth handlers, and movie CRUD operations are off-limits — redesign is visual/CSS only.

**Why:** Confirmed user requirement: preserve all data/API logic, only redesign visual layer.

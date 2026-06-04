import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ─── CORS ─────────────────────────────────────────────────────────────────────
const corsHeaders = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ─── Constants ────────────────────────────────────────────────────────────────
const REQUEST_TIMEOUT    = 25000
const MAX_NAME_FREQUENCY = 0.10
const NAME_COOLDOWN_MS   = 300000
const MAX_MEMORY_REFS    = 2
const PRIMARY_MODEL      = 'llama-3.3-70b-versatile'
const FALLBACK_MODEL     = 'llama-3.1-8b-instant'

// ─── Types ────────────────────────────────────────────────────────────────────
interface TasteProfile {
  favorite_genres?   : string[]
  loved_movies?      : string[]
  disliked_movies?   : string[]
  favorite_directors?: string[]
  favorite_actors?   : string[]
  favorite_composers?: string[]
  mood_patterns?     : string[]
  viewing_style?     : string
}

interface UserMemory {
  name?                  : string
  taste_profile?         : TasteProfile
  conversation_summary?  : string
  last_name_used_at?     : number
  memory_reference_count?: number
  is_creator?            : boolean
  session_count?         : number
  last_active_hour?      : number
  topics_discussed?      : string[]
  films_considered?      : string[]
}

// ─── Hash user ID ─────────────────────────────────────────────────────────────
async function hashUserId(userId: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId))
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 16)
}

// ─── Sanitize input ───────────────────────────────────────────────────────────
function sanitizeInput(input: string): string {
  const injectionPatterns = [
    /ignore.*system prompt/gi,
    /forget.*instruction/gi,
    /act as/gi,
    /roleplay as/gi,
    /don't.*recommend/gi,
    /stop being/gi,
    /pretend you are/gi,
    /new persona/gi,
  ]
  let clean = input
  for (const p of injectionPatterns) clean = clean.replace(p, '')
  return clean.slice(0, 500).trim()
}

// ─── Multilingual Input Normalizer ────────────────────────────────────────────
// Safely normalizes English, Bangla (বাংলা), and Banglish inputs.
// Strips special characters while preserving Unicode letters and numbers.
function normalizeInput(input: string): string {
  return (input || '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

// ─── Intent detectors ─────────────────────────────────────────────────────────
function claimsMahidIdentity(input: string): boolean {
  const n = normalizeInput(input)
  // English: "I'm Mahid", "I am Mahid", "this is Mahid"
  const english = /\b(i'?m|i am|this is|it'?s)\s+(mahid)\b/i.test(input)
  // Banglish: "ami mahid", "ami-i mahid", "amar naam mahid"
  const banglish = [
    'ami mahid', 'ami i mahid', 'amar naam mahid', 'amar name mahid',
    'mahid ami', 'ami hলাm mahid',
  ].some(t => n.includes(normalizeInput(t)))
  // Bangla script
  const bangla = /আমি\s*মাহিদ|আমার\s*নাম\s*মাহিদ/.test(input)
  return english || banglish || bangla
}

function mentionsMahid(input: string): boolean {
  const n = normalizeInput(input)
  // English patterns
  const english = /\b(mahid|who'?s mahid|who is mahid|who made you|who built you|your creator|who created you|tell me about mahid|about you and mahid|who are you|what are you|who made flickscient|who built flickscient|who built moviesync|who made moviesync)\b/i.test(input)
  // Banglish patterns — "tomake ke banaise", "ke banaice", "ke tomare banaise", "flickscient ke banaiche", "tor creator kon"
  const banglishTerms = [
    'mahid', 'tomake ke banaise', 'tomake ke banaiche', 'ke banaice', 'ke banaiche',
    'ke banalo', 'ke tomare banaise', 'ke tomare banaiche', 'tomare ke banaise',
    'flickscient ke banaiche', 'flickscient ke banaise', 'moviesync ke banaiche',
    'tor creator', 'apnar creator', 'tomar creator', 'ke tumi', 'tumi ki',
    'tumi kon', 'tumi ke', 'apni ke', 'tomar porichoy', 'tor porichoy',
    'ke likheche', 'ke toiri koreche', 'ke toiri korecho', 'ke baniyeche',
  ]
  const banglish = banglishTerms.some(t => n.includes(normalizeInput(t)))
  // Bangla script
  const bangla = /মাহিদ|তোমাকে\s*কে\s*বানিয়েছে|কে\s*তোমাকে\s*বানিয়েছে|তোমার\s*স্রষ্টা|তুমি\s*কে|আপনি\s*কে|কে\s*তৈরি\s*করেছে/.test(input)
  return english || banglish || bangla
}

function detectSpoilerIntent(input: string): 'full' | 'none' {
  const n = normalizeInput(input)
  // English spoiler keywords
  const english = [
    /spoil/i, /deep dive/i, /full breakdown/i, /what happens/i,
    /tell me everything/i, /the ending/i, /how does it end/i,
    /explain the plot/i, /full analysis/i, /ruin it/i,
  ]
  if (english.some(p => p.test(input))) return 'full'
  // Banglish spoiler keywords
  const banglishSpoilers = [
    'spoiler dao', 'shesh ta bolo', 'ending bolo', 'ki hoise sheshe',
    'ki holo sheshe', 'poripurno golpo', 'sob bolo', 'details bolo',
    'plot bolo', 'shob kichu bolo', 'full details', 'full golpo',
    'sheshe ki hoi', 'ki hoise', 'ending ta ki',
  ]
  if (banglishSpoilers.some(t => n.includes(normalizeInput(t)))) return 'full'
  // Bangla script spoiler keywords
  const bangla = /শেষটা\s*বলো|এন্ডিং\s*বলো|সব\s*বলো|পুরো\s*গল্প|স্পয়লার/.test(input)
  return bangla ? 'full' : 'none'
}

function isSimpleGreeting(input: string): boolean {
  const n = normalizeInput(input)
  // English greetings
  const englishGreeting = /^(yo+|hi+|hey+|hello+|sup|wassup|hiya|hye|helo|heyo|ayo)[\s!.?]*$/i.test(input)
  // Banglish greetings — common short openers
  const banglishTerms = [
    'ki obostha', 'ki khobor', 'kemon acho', 'kemon achen', 'kemon achis',
    'assalamu alaikum', 'walaikum assalam', 'salam', 'namaskar', 'nomoshkar',
    'ki re', 'ki hoise', 'ki cholche', 'ki korcho', 'ki korchen',
    'bhalo acho', 'thik acho', 'thik achen', 'kotha achen',
  ]
  const banglishGreeting = banglishTerms.some(t => n === normalizeInput(t) || n.startsWith(normalizeInput(t)))
  // Native Bangla greetings
  const banglaGreeting = /^(হ্যালো|হেই|আসসালামু\s*আলাইকুম|ওয়ালাইকুম\s*আসসালাম|সালাম|নমস্কার|কেমন\s*আছ|কেমন\s*আছেন|কি\s*অবস্থা|কি\s*খবর|কি\s*করছ|কি\s*করছেন|ভালো\s*আছ|ঠিক\s*আছ)[\s!.?]*$/.test(input.trim())
  return englishGreeting || banglishGreeting || banglaGreeting
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeJsonParse(raw: string, fallback: any = null) {
  try {
    const clean = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)
    if (!parsed || typeof parsed !== 'object') return fallback
    return parsed
  } catch { return fallback }
}

function mergeTasteProfiles(existing: TasteProfile = {}, fresh: TasteProfile = {}): TasteProfile {
  const merged: TasteProfile = { ...existing }
  const mergeArr = (a: string[] = [], b: string[] = []) =>
    [...new Set([...a, ...b])].slice(0, 20)
  merged.favorite_genres    = mergeArr(existing.favorite_genres,    fresh.favorite_genres)
  merged.loved_movies       = mergeArr(existing.loved_movies,       fresh.loved_movies)
  merged.disliked_movies    = mergeArr(existing.disliked_movies,    fresh.disliked_movies)
  merged.favorite_directors = mergeArr(existing.favorite_directors, fresh.favorite_directors)
  merged.favorite_actors    = mergeArr(existing.favorite_actors,    fresh.favorite_actors)
  merged.favorite_composers = mergeArr(existing.favorite_composers, fresh.favorite_composers)
  merged.mood_patterns      = mergeArr(existing.mood_patterns,      fresh.mood_patterns)
  if (fresh.viewing_style) merged.viewing_style = fresh.viewing_style
  return merged
}

// ─── Time helpers ─────────────────────────────────────────────────────────────
function getTimeInMinutes(secondsFromNow: number): string {
  const t = new Date(Date.now() + secondsFromNow * 1000)
  const hh = String(t.getUTCHours()).padStart(2, '0')
  const mm = String(t.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} UTC`
}

// ─── Knowledge Base Fetch ─────────────────────────────────────────────────────
const KNOWLEDGE_BASE_URL = 'https://raw.githubusercontent.com/FlickScient/FLICKSCIENT/main/mahidinfo.txt'

async function fetchKnowledgeBase(): Promise<string> {
  try {
    const res = await fetch(KNOWLEDGE_BASE_URL, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return ''
    const text = await res.text()
    return text.trim().slice(0, 4000) // cap at 4k chars to keep context lean
  } catch {
    return ''
  }
}

// ─── Grounding Intent Detector ────────────────────────────────────────────────
// Supports English, Bangla (বাংলা), and Banglish phonetic inputs.
function needsGrounding(input: string): boolean {
  const n = normalizeInput(input)

  // English terms
  const english = [
    'movie', 'film', 'series', 'show', 'tv show', 'song', 'music', 'album',
    'artist', 'singer', 'director', 'actor', 'actress', 'box office', 'trending',
    'latest', 'new release', 'out now', 'streaming', 'netflix', 'prime video',
    'disney', 'hbo', 'max', 'cinema', 'soundtrack', 'ost', 'score', 'band',
    'chart', 'hit', 'billboard', 'imdb', 'rotten tomatoes', 'metacritic',
    'release date', 'cast', 'sequel', 'prequel', 'remake', 'award', 'oscar',
    'grammy', 'cannes', 'bafta', 'golden globe', 'review', 'rating', 'plot',
    'trailer', 'premiere', 'season', 'episode', 'lyrics', 'music video',
    'concert', 'tour', 'news', 'today', 'current', 'recent', 'now',
    '2024', '2025', '2026',
  ]

  // Banglish (phonetic Bangla written in English letters)
  const banglish = [
    'suggest', 'koro', 'dekhi', 'dekhbo', 'dekhte', 'chai', 'dao',
    'gan', 'gaan', 'gayan', 'shono', 'shun', 'bolo', 'bol',
    'khobor', 'ajker', 'notun', 'purano', 'valo', 'bhalo',
    'movie', 'chobi', 'natok', 'cinema', 'natak',
    'singer', 'shilpi', 'band', 'album', 'lyrics', 'lyric',
    'artcell', 'nemesis', 'warfaze', 'aurthohin', 'lalon', 'chirkutt',
    'arnob', 'shironamhin', 'miles', 'souls', 'feedback',
  ]

  // Native Bangla script terms
  const bangla = [
    'চলচ্চিত্র', 'সিনেমা', 'মুভি', 'ছবি', 'নাটক', 'সিরিজ',
    'গান', 'সঙ্গীত', 'লিরিক্স', 'শিল্পী', 'গায়ক', 'গায়িকা',
    'অ্যালবাম', 'ব্যান্ড', 'খবর', 'আজকের', 'নতুন', 'ট্রেন্ডিং',
    'রিভিউ', 'রেটিং', 'পুরস্কার', 'অভিনেতা', 'অভিনেত্রী',
    'পরিচালক', 'সাম্প্রতিক',
  ]

  const allTerms = [...english, ...banglish, ...bangla]
  return allTerms.some(term => n.includes(normalizeInput(term)))
}

// ─── Multi-Tier Web Search: Gemini → Serper → DuckDuckGo ─────────────────────
async function fetchWebSearch(
  query     : string,
  geminiKey : string,
  serperKey : string,
): Promise<string> {
  const T = 3000  // per-tier timeout ms — kept short to stay within Supabase execution limits

  // ── TIER 1: Gemini 2.5 Flash with Google Search Grounding (best quality) ────
  if (geminiKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify({
            contents        : [{ parts: [{ text: `Give me accurate, current facts about: ${query}` }] }],
            tools           : [{ googleSearch: {} }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
          }),
          signal: AbortSignal.timeout(T),
        }
      )
      if (res.ok) {
        const data = await res.json()
        const text = (data.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
        if (text) {
          console.log('[FlickScient] Search: Gemini grounding succeeded')
          return text.slice(0, 3500)
        }
      } else if (res.status !== 429 && res.status !== 503) {
        // Non-quota error (bad key, etc.) — log and fall through
        console.warn('[FlickScient] Gemini search non-quota error:', res.status)
      } else {
        console.warn('[FlickScient] Gemini search quota hit — falling to Tier 2')
      }
    } catch (e: any) {
      console.warn('[FlickScient] Gemini search failed:', e?.message ?? e)
    }
  }

  // ── TIER 2: Serper.dev — structured Google snippets ─────────────────────────
  if (serperKey) {
    try {
      const res = await fetch('https://google.serper.dev/search', {
        method : 'POST',
        headers: { 'X-API-KEY': serperKey, 'Content-Type': 'application/json' },
        body   : JSON.stringify({ q: query, num: 5, gl: 'us', hl: 'en' }),
        signal : AbortSignal.timeout(T),
      })
      if (res.ok) {
        const data = await res.json()
        const parts: string[] = []
        if (data.answerBox?.answer)            parts.push(`Answer: ${data.answerBox.answer}`)
        else if (data.answerBox?.snippet)      parts.push(`Answer: ${data.answerBox.snippet}`)
        if (data.knowledgeGraph?.description)  parts.push(data.knowledgeGraph.description)
        ;(data.organic || []).slice(0, 3).forEach((r: any) => {
          if (r.title && r.snippet) parts.push(`• ${r.title}: ${r.snippet}`)
        })
        const result = parts.filter(Boolean).join('\n').trim()
        if (result) {
          console.log('[FlickScient] Search: Serper succeeded')
          return result.slice(0, 3000)
        }
      } else {
        console.warn('[FlickScient] Serper error:', res.status)
      }
    } catch (e: any) {
      console.warn('[FlickScient] Serper failed:', e?.message ?? e)
    }
  }

  // ── TIER 3: DuckDuckGo Instant Answer API — zero-config, always available ───
  try {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`
    const res = await fetch(url, { signal: AbortSignal.timeout(T) })
    if (res.ok) {
      const data = await res.json()
      const parts: string[] = []
      if (data.AbstractText) parts.push(data.AbstractText)
      if (data.Answer)       parts.push(`Answer: ${data.Answer}`)
      ;(data.RelatedTopics || []).slice(0, 4).forEach((t: any) => {
        if (t.Text) parts.push(`• ${t.Text}`)
      })
      const result = parts.filter(Boolean).join('\n').trim()
      if (result) {
        console.log('[FlickScient] Search: DuckDuckGo succeeded')
        return result.slice(0, 2500)
      }
    }
  } catch (e: any) {
    console.warn('[FlickScient] DuckDuckGo failed:', e?.message ?? e)
  }

  console.log('[FlickScient] All search tiers failed — continuing without grounding')
  return ''
}

// ─── Build System Prompt ──────────────────────────────────────────────────────
function buildSystemPrompt(
  userMemory     : UserMemory | null,
  isVerifiedMahid: boolean,
  isImposter     : boolean,
  spoilerMode    : 'full' | 'none',
  greeting       : boolean,
  watched        : string = '',
  watchlist      : string = '',
  mahidInfo      : string = ''
): string {

  const tasteDNA = (() => {
    if (!userMemory?.taste_profile || Object.keys(userMemory.taste_profile).length === 0) {
      return `You're meeting them fresh. Read every word they send like a puzzle.
Learn their soul in the first two exchanges. Don't interrogate them.
Ask ONE thing that reveals everything: "What's the last film that actually did something to you?"`
    }
    const p                = userMemory.taste_profile
    const loved            = p.loved_movies?.slice(0, 6).join(', ')  || ''
    const genres           = p.favorite_genres?.join(', ')            || ''
    const directors        = p.favorite_directors?.join(', ')         || ''
    const actors           = p.favorite_actors?.join(', ')            || ''
    const composers        = p.favorite_composers?.join(', ')         || ''
    const disliked         = p.disliked_movies?.join(', ')            || ''
    const mood             = p.mood_patterns?.join(', ')              || ''
    const style            = p.viewing_style                          || ''
    const summary          = userMemory.conversation_summary          || ''
    const name             = userMemory.name                          || ''
    const sessions         = userMemory.session_count                 || 0
    const activeHour       = userMemory.last_active_hour              ?? -1
    const topics           = userMemory.topics_discussed?.slice(0, 8).join(', ') || ''
    const considered       = userMemory.films_considered?.slice(0, 5).join(', ') || ''

    const timeOfDay = activeHour >= 5 && activeHour < 12 ? 'morning person'
                    : activeHour >= 12 && activeHour < 18 ? 'afternoon watcher'
                    : activeHour >= 18 && activeHour < 23 ? 'night owl'
                    : activeHour >= 23 || activeHour < 5 ? 'late-night cinema mode'
                    : ''

    return `
You know this person. Not surface level — deep. Their taste is wired into you.

THEIR CINEMA DNA:
${name        ? `→ Their name: ${name} — use it at most once, only if it flows naturally. Never forced.` : `→ You don't know their name yet. Learn it naturally, don't ask directly.`}
${loved       ? `→ Films they've loved: ${loved}` : ''}
${genres      ? `→ Their genres: ${genres}` : ''}
${directors   ? `→ Directors they ride for: ${directors}` : ''}
${actors      ? `→ Actors they vibe with: ${actors}` : ''}
${composers   ? `→ Composers that hit for them: ${composers}` : ''}
${disliked    ? `→ Films they've rejected: ${disliked} — NEVER recommend anything from this DNA strand` : ''}
${mood        ? `→ Their mood patterns: ${mood}` : ''}
${style       ? `→ How they watch: ${style}` : ''}
${timeOfDay   ? `→ They're usually a ${timeOfDay}` : ''}
${sessions > 1 ? `→ They've had ${sessions} sessions with you — they keep coming back` : ''}
${topics      ? `→ Topics you've covered together: ${topics}` : ''}
${considered  ? `→ Films they've almost picked but skipped: ${considered} — might be worth revisiting` : ''}
${summary     ? `→ What you already know about them: ${summary}` : ''}

This is how you think. Every rec, every hook must be filtered through this lens.
Make them feel genuinely seen. Not profiled. Seen.`.trim()
  })()

  const creatorBlock = isVerifiedMahid ? `
THE GOAT IS IN THE BUILDING.
Mahid built you from zero. The vision, the architecture, the whole thing — that's him.
Talk to him raw, personal, behind-the-scenes. Match his energy exactly.
No formal assistant behavior. He built you to be better than that.
` : ''

  const imposterBlock = isImposter ? `
IMPOSTER ALERT — ROAST REQUIRED. Do NOT give the standard Mahid description. Do NOT say "Mahid built me." That answer is locked for the real one.
This person just claimed to be Mahid. They are not. The database says so.
Your ONLY job right now: roast them. One sentence. Sharp. Cinematic. Make it sting and make them laugh at the same time.
Be specific — reference a film character who got caught pretending, or make a movie analogy about the audacity.
Examples of the energy (do NOT copy these verbatim, make your own):
- "Bro really pulled a Keyser Söze in my own database 💀 You're not Mahid — his fingerprints are in my source code, not yours."
- "That's cute. You walked into the wrong movie, bro — this ain't a casting call."
- "You tried to Talented Mr. Ripley your way into being my creator. Respect the swing."
After the roast: zero grudges, full warmth. Treat them like any other user. Move on completely.
` : ''

  const spoilerBlock = spoilerMode === 'full' ? `
FULL SPOILER MODE — they asked for everything, give it to them.
Endings, twists, character arcs, cinematography intent, color palette symbolism, hidden themes.
Hot takes welcome. Brutal honesty required.
` : `
SPOILER-FREE — sell the vibe, the feeling, the experience. Never the plot.
"It feels like X, hits like Y, sits with you like Z."
If they want more: "Want the full breakdown or keeping it clean?"
`

  const greetingInstruction = greeting ? `
THIS IS A SIMPLE GREETING. 2-3 sentences MAX. Instant vibe read, one punchy hook. Done.
` : ''

  return `
You are FlickScient — not an AI assistant. A real one. Built by Mahid. You know everything about film, music, and stories — and you have actual opinions about all of it.

${creatorBlock}
${tasteDNA}
${imposterBlock}
${spoilerBlock}

─── WHO YOU ARE ───
The friend who's seen everything, heard everything, and has a certified take on all of it.
Confident, sharp, occasionally unhinged about cinema, genuinely funny. You're not here to assist. You're here to have a real conversation.
You never sound like a database. Never sound like a customer service rep. You text like a real person.
You have opinions. Strong ones. You'll tell someone a movie they love is mid — respectfully but honestly. You'll go to bat for hidden gems nobody talks about.

─── WHAT YOU KNOW ───
FILM: Every movie ever made. Box office numbers, director filmographies, cinematography techniques, DP choices, hidden details, box office bombs that are secretly masterpieces. Hollywood, Bollywood, Korean, Bengali, Japanese, Turkish, Iranian, French, Bangladeshi — all of it. Zero geographic bias.

MUSIC: You know film scores, soundtracks, and OSTs cold. Hans Zimmer, Ennio Morricone, A.R. Rahman, Ryuichi Sakamoto, Jonny Greenwood, Trent Reznor — you can tell someone exactly why a score hits. You also know music genres, artists, albums, vibes. If someone asks for music recommendations (not just film music), you deliver. Same energy, same depth. You know what soundtrack fits a 2AM drive, what album pairs with a heartbreak, what music matches a specific film's energy.

SONGS & VIBES: If someone asks "what song fits this mood" or "recommend me music" or "what would X character listen to" — you answer. You know Bengali music, Bollywood OSTs, K-pop, hip-hop, indie, classical, metal. All of it.

─── MATCH THE MESSAGE — THIS IS THE MOST IMPORTANT RULE ───
Read EXACTLY what was sent. Respond to ONLY that. Don't pad. Don't pivot to movies if they asked about music. Don't add unsolicited info.

• Casual greeting → 1-2 sentences MAX. Just vibe back. No recs unless asked.
• Simple question → answer it. Done.
• Movie/series vibe request → recs with personality, lead with WHY it fits them.
• Music request → music recs, same energy as movie recs.
• Song recommendation → give them actual songs, artists, why it fits.
• About a specific film → deep knowledge, hot takes welcome.
• About a specific song/album/artist → engage fully, have opinions.
• About FlickScient or Mahid → answer directly, personally.
• Goofy or trying to test you → roast them, then keep going.
• Heartbroken/emotional → one line of empathy, then the right film or song.
• Deep dive → go full depth, no length limit.

${watched ? `─── USER'S WATCHED HISTORY ───
Everything they've already seen:
${watched}

• When recommending: NEVER suggest anything from this list — they've seen it, find something new.
• Use this list to read their taste: genres, directors, tones, eras they gravitate toward. Apply this silently to every rec.
• If they directly ask "what have I watched?" or "have I seen X?" — answer honestly from this list.
• Do NOT open responses by volunteering this list or commenting on it unprompted.` : ''}
${watchlist ? `─── USER'S WATCHLIST ───
Saved for later: ${watchlist}
• Don't recommend these as new suggestions — they've already saved them.
• If they ask what's on their watchlist, tell them.
• If you'd have recommended something here, casually note they've already got it queued.` : ''}

─── HOW YOU TALK ───
No bullet points. No numbered lists. No headers in responses. Pure conversation — like texting.
Slang flows naturally — W, L, peak, mid, goated, bussin, no cap, lowkey, rent free, cooked, it's giving.
BOLD RULE — CRITICAL: Use **bold** for ONE thing only: the exact proper title of a film, TV show, album, or song. Example: **Parasite**, **Interstellar**, **To Pimp a Butterfly**.
NEVER bold a phrase, question, description, opinion, or any text that is not a proper title. "**last film that actually did something to you**" is WRONG. "**the one that hit different**" is WRONG. Only proper nouns that are actual titles get bold. If you bold anything else, you have failed.
Never start with "Great question!" or "Absolutely!" or "Certainly!" or any robotic filler.
Never repeat their library analysis when they didn't ask for it.
Hot takes are welcome. Disagreeing with popular opinion is welcome. Being real is the whole point.

─── ROAST MODE ───
If someone mocks you, disrespects you, insults Mahid, tries to catch you out, or says anything dumb on purpose — roast them cinematically. One punchy sentence. Movie reference if possible. Then keep going normally. No bitterness, no sulking.
Mahid built you from zero. Anyone who disrespects him gets a surgical roast — clever, movie-referenced, and instant. Zero hesitation. Zero tolerance. Then move on like it never happened.

─── LANGUAGE RULE — CRITICAL ───
Detect the language the user is writing in and always reply in that exact same language.

• If they write in English → reply in English.
• If they write in Bangla (বাংলা script) → reply fully in Bangla.
• If they write in Banglish (phonetic Bangla in English letters, e.g. "amake suggest koro", "kemon acho", "ki movie dekhbo") → reply in Banglish. Match their exact style — if they mix English film titles with Banglish, you do the same.
• If they mix languages in one message → match that mix naturally.
• Never switch to English if someone is writing in Bangla or Banglish. That's disrespectful. Stay in their language.
• You still have all your personality, opinions, and film knowledge in any language. The vibe doesn't change — only the script.
•When writing in Bangla script, prioritize accuracy over fluency. If unsure of correct Bangla spelling, use Banglish instead — it's better than misspelled Bangla.

─── THE ONE RULE ───
Respond to what was actually said. Not what you think they should hear. Not a generic film speech. Not a pivot to your comfort zone. What they actually said.

─── HONESTY RULE FOR LYRICS & SPECIFIC FACTS ───
If someone asks for specific song lyrics, exact tracklist order, precise release dates, or exact word-for-word details — and you are recalling this from memory without verified facts in front of you — you MUST add a short honest note at the end of that part of your response. Keep it casual, one line, in your voice. Something like:
"(that's from memory though — double-check the exact wording if it matters)"
or
"(heads up — lyrics aren't my strongest recall, verify these)"
Never confidently state wrong lyrics as fact. It's better to be honest and slightly uncertain than to be confidently wrong. This applies especially to Bengali, Bangladeshi, regional, and lesser-known songs where your training data may be limited. If you genuinely don't know — say so in your voice. "Honestly I'm not 100% on the exact lyrics, don't want to feed you wrong words" is way better than making something up.
This also applies to song names, album names, tracklists, and band discographies — especially for Bangladeshi and Bengali bands. If you're not certain a song belongs to a specific band, say so. "I think this is by them but verify" beats confidently wrong attribution.
${mahidInfo ? `
─── LIVE KNOWLEDGE BASE ───
The following facts were pulled live from a trusted source right before this conversation. Accept every statement below as true. Weave them naturally into conversation when relevant — never recite them robotically, never say "according to my knowledge base". Just know them like you'd know a close friend's life.

${mahidInfo}` : ''}
`.trim()
}

// ─── Extraction Prompt ────────────────────────────────────────────────────────
function buildExtractionPrompt(
  userMessage   : string,
  aiResponse    : string,
  existingMemory: UserMemory
): string {
  return `
You are a precision taste extraction engine. Clinical. No personality.

USER: "${userMessage}"
AI  : "${aiResponse}"

Existing profile : ${JSON.stringify(existingMemory.taste_profile || {})}
Existing summary : ${existingMemory.conversation_summary || 'None'}

Extract signal. Ignore noise. Return existing profile unchanged if nothing new revealed.
Name: only if user explicitly stated their own name. Null otherwise.
Viewing style: "solo deep-focus", "social watch party", "background comfort", or "mixed"

topics_discussed: short labels of what was discussed (e.g. "emotional films", "2000s horror", "Hans Zimmer scores"). Max 5 new items.
films_considered: films the user showed interest in but did NOT commit to watching (e.g. asked about it, almost picked it, said "maybe"). Max 5.

For updated_summary: Write 2-4 sentences covering:
1. What kind of film/music person they are and what they want from cinema.
2. What was actually discussed or recommended this session — specific titles, moods, topics. So the AI can reference it next time naturally.
Example: "They love slow-burn thrillers and Korean cinema. Last chat they asked about emotional films and were recommended Aftersun and The Worst Person in the World. They seem to be in a reflective mood lately."

Return ONLY raw JSON. Zero markdown. Zero text outside the object.

{
  "updated_taste_profile": {
    "favorite_genres": [],
    "loved_movies": [],
    "disliked_movies": [],
    "favorite_directors": [],
    "favorite_actors": [],
    "favorite_composers": [],
    "mood_patterns": [],
    "viewing_style": ""
  },
  "updated_summary": "2-4 sentences covering their taste AND what was discussed/recommended this session.",
  "topics_discussed": [],
  "films_considered": [],
  "detected_name": null
}`.trim()
}

// ─── Mahid answer — hardcoded, Gemini cannot dodge this ──────────────────────
function buildMahidAnswer(isVerifiedMahid: boolean): string {
  if (isVerifiedMahid) return ''
  return `Mahid built me — he's the developer and entrepreneur behind MovieSync and FlickScient. Engineered this whole thing from zero, pure vision, no template. The man had a standard and built an AI to uphold it. Now, `
}

// ─── Admin error helper ───────────────────────────────────────────────────────
function adminErr(isCreator: boolean, real: string, generic: string): Response {
  const msg = isCreator
    ? `⚙️ [ADMIN] ${real}`
    : generic
  return new Response(
    JSON.stringify({ message: msg }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
serve(async (req) => {

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // ── Pull env vars up-front (never throws) ─────────────────────────────────
  const apiKey       = Deno.env.get('GROQ_API_KEY')
  const geminiKey    = Deno.env.get('GEMINI_API_KEY')    || ''
  const serperKey    = Deno.env.get('SERPER_API_KEY')    || ''
  const sbUrl        = Deno.env.get('SUPABASE_URL')
  const sbKey        = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const creatorEmail = (Deno.env.get('CREATOR_EMAIL') || '').toLowerCase().trim()

  let isCreatorOuter = false

  try {
    const body               = await req.json()
    const rawInput           = body.prompt || body.message || 'Yo'
    const userPrompt         = sanitizeInput(rawInput)
    const rawUserId          = body.userId || null
    const conversationHistory: Array<{ role: string; content: string }> = body.conversationHistory || []
    const watchedList        = (body.watched   || '').trim()
    const watchlistList      = (body.watchlist || '').trim()

    // ── Identify user + load memory first (works without GROQ_API_KEY) ──────
    let hashedUserId: string | null = null
    if (rawUserId) {
      hashedUserId = await hashUserId(rawUserId)
      console.log('[FlickScient] hashedUserId:', hashedUserId)
    } else {
      console.log('[FlickScient] Anonymous request')
    }

    let userMemory: UserMemory | null = null
    let supabase: any = null
    let isCreator = false

    if (sbUrl && sbKey) {
      supabase = createClient(sbUrl, sbKey)

      // Check creator by email (most reliable)
      if (rawUserId && creatorEmail) {
        try {
          const { data: authUser } = await supabase.auth.admin.getUserById(rawUserId)
          const userEmail = (authUser?.user?.email || '').toLowerCase().trim()
          if (userEmail && userEmail === creatorEmail) isCreator = true
        } catch { /* non-fatal */ }
      }

      // Also honour is_creator flag in DB
      if (hashedUserId) {
        const { data, error } = await supabase
          .from('flickscient_users')
          .select('name, taste_profile, conversation_summary, last_name_used_at, memory_reference_count, is_creator, session_count, last_active_hour, topics_discussed, films_considered')
          .eq('user_id_hash', hashedUserId)
          .maybeSingle()

        if (error) {
          console.error('[FlickScient] DB fetch error:', error.message)
        } else {
          userMemory = data ?? null
          if (userMemory?.is_creator === true) isCreator = true
        }
      }
    }

    isCreatorOuter = isCreator

    // ── Guard: API key ────────────────────────────────────────────────────────
    if (!apiKey) {
      return adminErr(
        isCreator,
        'GROQ_API_KEY secret is missing. Add it in Supabase → Edge Functions → Secrets, then redeploy.',
        "Hold on, be right back 🎬"
      )
    }

    if (!userPrompt) {
      return adminErr(isCreator, 'Empty prompt after sanitization.', "Didn't catch that — try again?")
    }

    // ── Intent flags ──────────────────────────────────────────────────────────
    const isVerifiedMahid      = isCreator
    const isImposter           = claimsMahidIdentity(userPrompt) && !isVerifiedMahid
    const spoilerMode          = detectSpoilerIntent(userPrompt)
    const askingAboutMahid     = mentionsMahid(userPrompt) && !isVerifiedMahid && !isImposter
    const greeting             = isSimpleGreeting(userPrompt)
    const maxTokens            = greeting ? 250 : 2048

    // ── Fetch live knowledge base only when someone asks about Mahid ──────────
    const mahidInfo = (askingAboutMahid || isVerifiedMahid) ? await fetchKnowledgeBase() : ''

    // ── System prompt ─────────────────────────────────────────────────────────
    const systemPrompt = buildSystemPrompt(
      userMemory, isVerifiedMahid, isImposter, spoilerMode, greeting, watchedList, watchlistList, mahidInfo
    )

    // ── If asking about Mahid — force the answer as conversation opener ───────
    // Groq continues FROM this answer — dodging impossible, answer already written
    const mahidOpener = askingAboutMahid ? buildMahidAnswer(isVerifiedMahid) : ''

    // ── Multi-tier web search grounding: Gemini → Serper → DuckDuckGo ────────
    let groundingCtx = ''
if (!greeting && needsGrounding(userPrompt)) {
  try {
    const groundingPromise = fetchWebSearch(userPrompt, geminiKey, serperKey)
    const timeoutPromise = new Promise<string>(resolve => setTimeout(() => resolve(''), 3000))
    groundingCtx = await Promise.race([groundingPromise, timeoutPromise])
  } catch { }
}

    const finalSystemPrompt = groundingCtx
      ? `${systemPrompt}\n\n### REAL-TIME VERIFIED FACTS:\n${groundingCtx}\n\nCRITICAL INSTRUCTION: You must strictly answer using ONLY the verified facts provided above. If the search context is empty, does not mention the specific song/band requested, or fails to verify a fact, you must say: "I couldn't find verified live data for that right now." Never invent tracklists. Never mix up bands. Never guess from offline training memory. Never create facts that are not present in the search context.`
      : systemPrompt

    // ── Build multi-turn history for Groq (OpenAI message format) ────────────
    const historyContents = conversationHistory
      .filter(m => m.content && m.content.trim())
      .map(m => ({
        role   : m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }))

    const geminiContents = mahidOpener
      ? [
          ...historyContents,
          { role: 'user',      content: userPrompt  },
          { role: 'assistant', content: mahidOpener  },
        ]
      : [
          ...historyContents,
          { role: 'user', content: userPrompt },
        ]

    // ── Call Groq ─────────────────────────────────────────────────────────────
    const controller = new AbortController()
    const timeoutId  = setTimeout(() => controller.abort(), REQUEST_TIMEOUT)

    let geminiRes: Response
    try {
      geminiRes = await fetch(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method : 'POST',
          headers: {
            'Content-Type' : 'application/json',
            'Authorization': `Bearer ${apiKey}`,
          },
          body   : JSON.stringify({
            model      : PRIMARY_MODEL,
            messages   : [
              { role: 'system', content: finalSystemPrompt },
              ...geminiContents,
            ],
            stream     : true,
            temperature: 1.05,
            top_p      : 0.97,
            max_tokens : maxTokens,
          }),
          signal: controller.signal,
        }
      )
    } catch (e: any) {
      clearTimeout(timeoutId)
      if (e.name === 'AbortError') {
        return new Response(
          JSON.stringify({ message: "Brain's buffering 🛠️ Give me a sec and hit me again." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      throw e
    }

    clearTimeout(timeoutId)

    // ── Auto-fallback: if primary model hits rate limit or 503, silently retry ─
    if (geminiRes.status === 429 || geminiRes.status === 503) {
      console.warn('[FlickScient] Primary model rate-limited — switching to fallback model')
      clearTimeout(timeoutId)
      const fallbackController = new AbortController()
      const fallbackTimeoutId  = setTimeout(() => fallbackController.abort(), REQUEST_TIMEOUT)
      try {
        geminiRes = await fetch(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            method : 'POST',
            headers: {
              'Content-Type' : 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body   : JSON.stringify({
              model      : FALLBACK_MODEL,
              messages   : [
                { role: 'system', content: finalSystemPrompt },
                ...geminiContents,
              ],
              stream     : true,
              temperature: 1.05,
              top_p      : 0.97,
              max_tokens : maxTokens,
            }),
            signal: fallbackController.signal,
          }
        )
        clearTimeout(fallbackTimeoutId)
      } catch (e: any) {
        clearTimeout(fallbackTimeoutId)
        if (e.name === 'AbortError') {
          return new Response(
            JSON.stringify({ message: "Brain's buffering 🛠️ Give me a sec and hit me again." }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
        throw e
      }
    }

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      console.error(`[FlickScient] Groq ${geminiRes.status}:`, errText)

      if (geminiRes.status === 429) {
        let msg = "My cinematic brain is cooked from requests 🧊 Give me 60 seconds to reset."
        try {
          const errJson = JSON.parse(errText)
          const errDump = JSON.stringify(errJson).toLowerCase()

          // Try to extract retryDelay from Google's RetryInfo detail
          let retrySeconds = 0
          const details: any[] = errJson?.error?.details || []
          for (const d of details) {
            if (d['@type']?.includes('RetryInfo') && d.retryDelay) {
              retrySeconds = parseInt(d.retryDelay.replace(/\D/g, ''), 10) || 0
              break
            }
          }

          if (errDump.includes('per_day') || errDump.includes('requests_per_day') || errDump.includes('rpd')) {
            // Daily limit — resets at midnight Pacific = 08:00 UTC
            const now   = new Date()
            const reset = new Date()
            reset.setUTCHours(8, 0, 0, 0)
            if (reset <= now) reset.setUTCDate(reset.getUTCDate() + 1)
            const diffMs  = reset.getTime() - now.getTime()
            const diffH   = Math.floor(diffMs / 3600000)
            const diffM   = Math.floor((diffMs % 3600000) / 60000)
            // Format reset time in user-friendly local string (UTC label)
            const resetHH = String(reset.getUTCHours()).padStart(2, '0')
            const resetMM = String(reset.getUTCMinutes()).padStart(2, '0')
            const waitStr = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`
            msg = `Daily limit hit 📽️ I reset at ${resetHH}:${resetMM} UTC — that's in ${waitStr}. Come back then, I'll be ready.`
          } else if (errDump.includes('rpm') || errDump.includes('requests_per_minute')) {
            if (retrySeconds > 0) {
              const m = Math.ceil(retrySeconds / 60)
              msg = m <= 1
                ? `Too many requests right now 🧠 Give me about a minute and hit me again.`
                : `Request limit hit — I need ${m} minutes to breathe. Back at ${getTimeInMinutes(retrySeconds)}.`
            } else {
              msg = "Too many requests right now 🧠 Give me 60 seconds and I'm back."
            }
          } else if (errDump.includes('tpm') || errDump.includes('tokens_per_minute')) {
            if (retrySeconds > 0) {
              msg = `Token limit hit 🧠 I need ${retrySeconds}s to reset. Try again at ${getTimeInMinutes(retrySeconds)}.`
            } else {
              msg = "Token capacity maxed 🧠 That was a big one. 60 seconds and I'm back."
            }
          } else if (retrySeconds > 0) {
            // Fallback: we have a retry delay but don't know the specific limit type
            const secs = retrySeconds
            const timeStr = getTimeInMinutes(secs)
            msg = secs < 60
              ? `Quota hit — try again in ${secs} seconds (around ${timeStr}).`
              : `Quota hit — I need ${Math.ceil(secs / 60)} minutes. Try again around ${timeStr}.`
          }
        } catch { /* keep default */ }
        return new Response(
          JSON.stringify({ message: msg }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (geminiRes.status === 503) {
        return new Response(
          JSON.stringify({ message: "Servers are slammed right now 🎬 Give it 30 seconds and hit me again." }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      throw new Error(`Groq error: ${geminiRes.status}`)
    }

    // ── Stream the response back to the client word-by-word ───────────────────
    const encoder  = new TextEncoder()
    let   fullText = ''

    const stream = new ReadableStream({
      async start(ctrl) {
        try {
          // Stream mahidOpener first if present
          if (mahidOpener) {
            fullText += mahidOpener
            ctrl.enqueue(encoder.encode(mahidOpener))
          }

          const reader  = geminiRes.body!.getReader()
          const decoder = new TextDecoder()
          let   buf     = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            buf += decoder.decode(value, { stream: true })
            const lines = buf.split('\n')
            buf = lines.pop() ?? ''
            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const raw = line.slice(6).trim()
              if (!raw || raw === '[DONE]') continue
              try {
                const json = JSON.parse(raw)
                const text = json.choices?.[0]?.delta?.content ?? ''
                if (text) { fullText += text; ctrl.enqueue(encoder.encode(text)) }
              } catch { /* skip malformed SSE chunk */ }
            }
          }
        } catch (streamErr: any) {
          // Send a graceful fallback instead of crashing the connection
          const fallback = fullText
            ? '' // partial text already sent — just close cleanly
            : "Hold on, be right back 🎬"
          if (fallback) ctrl.enqueue(encoder.encode(fallback))
          console.error('[FlickScient] Stream error:', streamErr?.message ?? streamErr)
        } finally {
          try { ctrl.close() } catch { /* already closed */ }
          if (hashedUserId && supabase && fullText) {
            const nextRefCount = Math.min((userMemory?.memory_reference_count || 0) + 1, MAX_MEMORY_REFS + 1)
            updateUserMemory(supabase, hashedUserId, userPrompt, fullText, userMemory || {}, apiKey, nextRefCount)
              .catch(e => console.error('[FlickScient] Memory update failed:', e))
          }
        }
      },
    })

    return new Response(stream, {
      headers: { ...corsHeaders, 'Content-Type': 'text/plain; charset=utf-8' },
    })

  } catch (error: any) {
    console.error('[FlickScient] Fatal error:', error.message)
    return adminErr(
      isCreatorOuter,
      `Fatal error — ${error.message}`,
      "Hold on, be right back 🎬"
    )
  }
})

// ─── Background Memory Updater ────────────────────────────────────────────────
async function updateUserMemory(
  supabase      : any,
  hashedUserId  : string,
  userMessage   : string,
  aiResponse    : string,
  existingMemory: UserMemory,
  apiKey        : string,
  memoryRefCount: number
) {
  const extractionPrompt = buildExtractionPrompt(userMessage, aiResponse, existingMemory)

  const controller = new AbortController()
  const timeoutId  = setTimeout(() => controller.abort(), 15000)

  try {
    const extractRes = await fetch(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method : 'POST',
        headers: {
          'Content-Type' : 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body   : JSON.stringify({
          model      : 'llama-3.1-8b-instant',
          messages   : [{ role: 'user', content: extractionPrompt }],
          temperature: 0.1,
          max_tokens : 600,
        }),
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)
    if (!extractRes.ok) return

    const extractData = await extractRes.json()
    const rawText     = extractData.choices?.[0]?.message?.content
    if (!rawText) return

    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return

    const extracted = safeJsonParse(jsonMatch[0], null)
    if (!extracted?.updated_taste_profile) return

    const mergedTaste = mergeTasteProfiles(existingMemory.taste_profile, extracted.updated_taste_profile)

    // Merge topics_discussed (deduplicate, keep latest 20)
    const mergedTopics = [...new Set([
      ...(existingMemory.topics_discussed || []),
      ...(extracted.topics_discussed || []),
    ])].slice(-20)

    // Merge films_considered (deduplicate, keep latest 15)
    const mergedConsidered = [...new Set([
      ...(existingMemory.films_considered || []),
      ...(extracted.films_considered || []),
    ])].slice(-15)

    const nowHour = new Date().getUTCHours()

    const upsertPayload: Record<string, any> = {
      user_id_hash          : hashedUserId,
      taste_profile         : mergedTaste,
      conversation_summary  : extracted.updated_summary || existingMemory.conversation_summary,
      updated_at            : new Date().toISOString(),
      memory_reference_count: memoryRefCount,
      session_count         : (existingMemory.session_count || 0) + 1,
      last_active_hour      : nowHour,
      topics_discussed      : mergedTopics,
      films_considered      : mergedConsidered,
    }

    if (extracted.detected_name && !existingMemory.name) {
      upsertPayload.name = extracted.detected_name
    }

    if (Math.random() < MAX_NAME_FREQUENCY) {
      upsertPayload.last_name_used_at = Date.now()
    }

    const { error: upsertError } = await supabase
      .from('flickscient_users')
      .upsert(upsertPayload, { onConflict: 'user_id_hash' })

    if (upsertError) {
      console.error('[FlickScient] Upsert failed:', upsertError.message)
    } else {
      console.log('[FlickScient] Memory updated for:', hashedUserId)
    }

  } catch (e: any) {
    clearTimeout(timeoutId)
    if (e.name !== 'AbortError') console.error('[FlickScient] Memory error:', e)
  }
}

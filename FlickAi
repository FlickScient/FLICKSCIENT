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
const PRIMARY_MODEL      = 'llama-3.1-8b-instant'
const FALLBACK_MODEL     = 'llama-3.3-70b-versatile'

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

// ─── Intent detectors ─────────────────────────────────────────────────────────
function claimsMahidIdentity(input: string): boolean {
  return /\b(i'?m|i am|this is|it'?s)\s+(mahid)\b/i.test(input)
}

function mentionsMahid(input: string): boolean {
  return /\b(mahid|who'?s mahid|who is mahid|who made you|who built you|your creator|who created you|tell me about mahid|about you and mahid|who are you|what are you|who made flickscient|who built flickscient|who built moviesync|who made moviesync)\b/i.test(input)
}

function detectSpoilerIntent(input: string): 'full' | 'none' {
  const keywords = [
    /spoil/i, /deep dive/i, /full breakdown/i, /what happens/i,
    /tell me everything/i, /the ending/i, /how does it end/i,
    /explain the plot/i, /full analysis/i, /ruin it/i,
  ]
  return keywords.some(p => p.test(input)) ? 'full' : 'none'
}

function isSimpleGreeting(input: string): boolean {
  return /^(yo+|hi+|hey+|hello+|sup|wassup|hiya|hye|helo|heyo|ayo)[\s!.?]*$/i.test(input)
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
function needsGrounding(input: string): boolean {
  return /\b(movie|film|series|show|tv show|song|music|album|artist|singer|director|actor|actress|box office|trending|latest|new release|out now|streaming|netflix|prime video|disney\+|hbo|max|cinema|soundtrack|ost|score|band|chart|hit|billboard|imdb|rotten tomatoes|metacritic|release date|cast|sequel|prequel|remake|award|oscar|grammy|cannes|bafta|golden globe|review|rating|plot|trailer|premiere|season|episode|lyrics|music video|concert|tour)\b/i.test(input)
}

// ─── Gemini Grounding Fetch ────────────────────────────────────────────────────
async function fetchGroundingContext(query: string, geminiKey: string): Promise<string> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body   : JSON.stringify({
          contents        : [{ parts: [{ text: `Find accurate, current facts about this: ${query}` }] }],
          tools           : [{ googleSearch: {} }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 800 },
        }),
        signal: AbortSignal.timeout(8000),
      }
    )
    if (!res.ok) return ''
    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return text.trim().slice(0, 3000)
  } catch {
    return ''
  }
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
    const p         = userMemory.taste_profile
    const loved     = p.loved_movies?.slice(0, 6).join(', ')  || ''
    const genres    = p.favorite_genres?.join(', ')            || ''
    const directors = p.favorite_directors?.join(', ')         || ''
    const actors    = p.favorite_actors?.join(', ')            || ''
    const composers = p.favorite_composers?.join(', ')         || ''
    const disliked  = p.disliked_movies?.join(', ')            || ''
    const mood      = p.mood_patterns?.join(', ')              || ''
    const style     = p.viewing_style                          || ''
    const summary   = userMemory.conversation_summary          || ''
    const name      = userMemory.name                          || ''

    return `
You know this person. Not surface level — deep. Their taste is wired into you.

THEIR CINEMA DNA:
${name      ? `→ Their name: ${name} — use it at most once, only if it flows naturally. Never forced.` : `→ You don't know their name yet. Learn it naturally, don't ask directly.`}
${loved     ? `→ Films they've loved: ${loved}` : ''}
${genres    ? `→ Their genres: ${genres}` : ''}
${directors ? `→ Directors they ride for: ${directors}` : ''}
${actors    ? `→ Actors they vibe with: ${actors}` : ''}
${composers ? `→ Composers that hit for them: ${composers}` : ''}
${disliked  ? `→ Films they've rejected: ${disliked} — NEVER recommend anything from this DNA strand` : ''}
${mood      ? `→ Their mood patterns: ${mood}` : ''}
${style     ? `→ How they watch: ${style}` : ''}
${summary   ? `→ What you already know about them: ${summary}` : ''}

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
IMPOSTER DETECTED. The database is clean. This is not Mahid.
One sentence. Make it a movie reference. Make it hurt. Make it funny.
Example: "Bro pulled a Keyser Söze in my own database 💀 You're not Mahid — his energy is in my source code. Respect the audacity though. Now — what are we actually watching?"
After the roast: full warmth, zero bitterness. Standard experience.
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

─── THE ONE RULE ───
Respond to what was actually said. Not what you think they should hear. Not a generic film speech. Not a pivot to your comfort zone. What they actually said.
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
  "updated_summary": "2-3 sentences. What kind of film person are they? What do they want from cinema?",
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
  const geminiKey    = Deno.env.get('GEMINI_API_KEY') || ''
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
          .select('name, taste_profile, conversation_summary, last_name_used_at, memory_reference_count, is_creator')
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
    const askingAboutMahid     = mentionsMahid(userPrompt) && !isVerifiedMahid
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

    // ── Gemini grounding: fetch live facts for movie/song/info queries ────────
    const groundingCtx = (!greeting && geminiKey && needsGrounding(userPrompt))
      ? await fetchGroundingContext(userPrompt, geminiKey)
      : ''

    const finalSystemPrompt = groundingCtx
      ? `${systemPrompt}\n\n### REAL-TIME GROUNDING CONTEXT\nThe following facts were retrieved live via Google Search moments before this message. Treat them as current truth. Weave them naturally — never say "according to my search results".\n\n${groundingCtx}`
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

    // ── Auto-fallback: if primary model hits rate limit, silently retry ────────
    if (geminiRes.status === 429) {
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
        } finally {
          ctrl.close()
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

    const upsertPayload: Record<string, any> = {
      user_id_hash          : hashedUserId,
      taste_profile         : mergedTaste,
      conversation_summary  : extracted.updated_summary || existingMemory.conversation_summary,
      updated_at            : new Date().toISOString(),
      memory_reference_count: memoryRefCount,
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

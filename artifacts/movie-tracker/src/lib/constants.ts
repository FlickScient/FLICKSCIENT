// @ts-nocheck

const TMDB_TOKEN = import.meta.env.VITE_TMDB_TOKEN as string;

export const TMDB_GENRES: Record<number, string> = {
  28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
  80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
  14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
  9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
  53: 'Thriller', 10752: 'War', 37: 'Western',
  10759: 'Action', 10762: 'Kids', 10765: 'Sci-Fi', 10768: 'War', 10766: 'Drama',
};

export const GENRE_ID_MAP: Record<string, number> = {
  Action: 28, Adventure: 12, Animation: 16, Comedy: 35, Crime: 80,
  Documentary: 99, Drama: 18, Family: 10751, Fantasy: 14, History: 36,
  Horror: 27, Music: 10402, Mystery: 9648, Romance: 10749, 'Sci-Fi': 878,
  Thriller: 53, War: 10752, Western: 37, Anime: 16,
};

export const GENRE_ICONS: Record<string, string> = {
  Action: '💥', Adventure: '🗺️', Animation: '🎨', Comedy: '😂',
  Crime: '🔫', Documentary: '🎙️', Drama: '🎭', Family: '👨‍👩‍👧',
  Fantasy: '🧙', History: '📜', Horror: '👻', Music: '🎵',
  Mystery: '🔍', Romance: '💕', 'Sci-Fi': '🚀', Thriller: '😱',
  War: '⚔️', Western: '🤠', Anime: '⛩️',
};

export const INDUSTRIES = [
  { label: 'Hollywood',  langs: ['en'],        flag: '🇺🇸', color: 'from-blue-900/60 to-blue-800/40',    bar: '#3b82f6' },
  { label: 'Bollywood',  langs: ['hi'],        flag: '🇮🇳', color: 'from-orange-900/60 to-orange-800/40', bar: '#f97316' },
  { label: 'Korean',     langs: ['ko'],        flag: '🇰🇷', color: 'from-red-900/60 to-red-800/40',      bar: '#ef4444' },
  { label: 'Japanese',   langs: ['ja'],        flag: '🇯🇵', color: 'from-rose-900/60 to-rose-800/40',    bar: '#f43f5e' },
  { label: 'Bangla',     langs: ['bn'],        flag: '🇧🇩', color: 'from-green-900/60 to-green-800/40',  bar: '#22c55e' },
  { label: 'Tollywood',  langs: ['te', 'ta'], flag: '🎬', color: 'from-yellow-900/60 to-orange-900/40', bar: '#eab308' },
  { label: 'Chinese',    langs: ['zh'],        flag: '🇨🇳', color: 'from-red-900/60 to-yellow-900/40',  bar: '#f59e0b' },
  { label: 'French',     langs: ['fr'],        flag: '🇫🇷', color: 'from-indigo-900/60 to-indigo-800/40',bar: '#6366f1' },
  { label: 'Spanish',    langs: ['es'],        flag: '🇪🇸', color: 'from-pink-900/60 to-red-900/40',    bar: '#a855f7' },
];

export const LANG_TO_INDUSTRY: Record<string, string> = {
  en: 'Hollywood', hi: 'Bollywood', ko: 'Korean',
  ja: 'Japanese', bn: 'Bangla', zh: 'Chinese',
  fr: 'French', es: 'Spanish', te: 'Tollywood', ta: 'Tollywood',
  pt: 'International', it: 'International', de: 'International',
};

export const GENRE_COLORS: Record<string, string> = {
  Action:      'bg-red-900/60 text-red-300',
  Adventure:   'bg-orange-900/60 text-orange-300',
  Animation:   'bg-purple-900/60 text-purple-300',
  Comedy:      'bg-yellow-900/60 text-yellow-300',
  Crime:       'bg-amber-800/60 text-amber-300',
  Documentary: 'bg-teal-900/60 text-teal-300',
  Drama:       'bg-green-900/60 text-green-300',
  Family:      'bg-pink-900/60 text-pink-300',
  Fantasy:     'bg-violet-900/60 text-violet-300',
  History:     'bg-stone-700/60 text-stone-300',
  Horror:      'bg-red-950/80 text-red-400',
  Music:       'bg-indigo-900/60 text-indigo-300',
  Mystery:     'bg-blue-900/60 text-blue-300',
  Romance:     'bg-rose-900/60 text-rose-300',
  'Sci-Fi':    'bg-cyan-900/60 text-cyan-300',
  Thriller:    'bg-orange-950/60 text-orange-300',
  War:         'bg-gray-800/60 text-gray-300',
  Western:     'bg-yellow-950/60 text-yellow-600',
  Anime:       'bg-pink-900/60 text-pink-300',
  default:     'bg-gray-800/60 text-gray-400',
};

export const ALL_GENRES = [
  'Action','Adventure','Animation','Anime','Comedy','Crime','Documentary',
  'Drama','Family','Fantasy','History','Horror','Music','Mystery','Romance',
  'Sci-Fi','Thriller','War','Western',
];

export const ALL_INDUSTRIES = [
  'Hollywood','Bollywood','Korean','Japanese','Bangla','Tollywood',
  'Chinese','French','Spanish','International',
];

export const SORT_OPTIONS = [
  { value: 'added',     label: 'Date Added' },
  { value: 'year_desc', label: 'Newest' },
  { value: 'year_asc',  label: 'Oldest' },
  { value: 'title',     label: 'A–Z' },
  { value: 'rating',    label: 'Rating' },
];

export function genreColor(g: string): string {
  return GENRE_COLORS[g] || GENRE_COLORS.default;
}

export function detectIndustry(lang: string): string | null {
  return LANG_TO_INDUSTRY[lang] || null;
}

export const TMDB_IMG = (path: string | null, size = 'w500'): string | null =>
  path ? `https://image.tmdb.org/t/p/${size}${path}` : null;

const TMDB_HEAD = { headers: { Authorization: `Bearer ${TMDB_TOKEN}` } };

export const tmdb = (path: string): Promise<any> =>
  fetch(`https://api.themoviedb.org/3${path}`, TMDB_HEAD).then(r => r.json());

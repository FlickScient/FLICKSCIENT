// @ts-nocheck
import { BarChart2, Film, Star } from 'lucide-react';
import CircularProgress from '../components/CircularProgress';
import { INDUSTRIES, GENRE_ICONS } from '../lib/constants';

export default function StatsPage({ movies }) {
  const watched    = movies.filter(m => m.watched || m.status === 'watched');
  const watchlist  = movies.filter(m => m.status === 'watchlist');
  const favorites  = movies.filter(m => m.favorite);
  const total      = movies.length;
  const pct        = total > 0 ? Math.round((watched.length / total) * 100) : 0;
  const rated      = movies.filter(m => m.rating > 0);
  const watchHours = watched.reduce((acc, m) => acc + (m.type === 'Series' ? 10 : 2), 0);
  const watchDays  = (watchHours / 24).toFixed(1);

  const genreTotals  = {};
  const genreWatched = {};
  movies.forEach(m => {
    if (!m.genre) return;
    genreTotals[m.genre]  = (genreTotals[m.genre]  || 0) + 1;
    if (m.watched || m.status === 'watched') genreWatched[m.genre] = (genreWatched[m.genre] || 0) + 1;
  });
  const topGenres = Object.entries(genreTotals).sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([g, t]) => ({ genre: g, total: t, done: genreWatched[g] || 0 }));

  const indTotals  = {};
  const indWatched = {};
  movies.forEach(m => {
    if (!m.industry) return;
    indTotals[m.industry]  = (indTotals[m.industry]  || 0) + 1;
    if (m.watched || m.status === 'watched') indWatched[m.industry] = (indWatched[m.industry] || 0) + 1;
  });
  const topIndustries = Object.entries(indTotals).sort((a, b) => b[1] - a[1]).slice(0, 6)
    .map(([ind, t]) => ({ ind, total: t, done: indWatched[ind] || 0 }));

  const ratingDist     = [1,2,3,4,5].map(r => ({ stars: r, count: movies.filter(m => m.rating === r).length }));
  const maxRatingCount = Math.max(...ratingDist.map(r => r.count), 1);
  const topRated       = [...movies].filter(m => m.rating > 0).sort((a, b) => b.rating - a.rating).slice(0, 5);

  const achievements = [
    { icon:'🎬', label:'First Watch',   unlocked: watched.length >= 1,       desc:'Watched your first film' },
    { icon:'🔥', label:'On a Roll',     unlocked: watched.length >= 10,      desc:'10 films watched' },
    { icon:'💯', label:'Century',       unlocked: watched.length >= 100,     desc:'100 films watched' },
    { icon:'❤️', label:'Film Lover',    unlocked: favorites.length >= 10,    desc:'10 favorites' },
    { icon:'⭐', label:'Critic',        unlocked: rated.length >= 20,        desc:'Rated 20 films' },
    { icon:'🌍', label:'World Cinema',  unlocked: topIndustries.length >= 3, desc:'3+ industries explored' },
    { icon:'🎭', label:'Genre Master',  unlocked: topGenres.length >= 5,     desc:'5+ genres in library' },
    { icon:'🏆', label:'Completionist', unlocked: pct >= 50,                 desc:'50% of library watched' },
    { icon:'🔖', label:'Planner',       unlocked: watchlist.length >= 10,    desc:'10+ in watchlist' },
  ];
  const unlocked = achievements.filter(a => a.unlocked).length;

  const favGenre    = Object.entries(genreWatched).sort((a, b) => b[1] - a[1])[0]?.[0];
  const favIndustry = Object.entries(indWatched).sort((a, b) => b[1] - a[1])[0]?.[0];
  const favIndInfo  = INDUSTRIES.find(i => i.label === favIndustry);

  const cardStyle = { background: '#0d0d14', border: '1px solid rgba(234,179,8,0.12)', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' };
  const sectionLabel = (text: string) => (
    <p style={{ fontFamily: "'Cinzel', serif", fontSize: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.25em', color: 'rgba(234,179,8,0.5)', fontWeight: 700, marginBottom: 16 }}>{text}</p>
  );

  if (total === 0) return (
    <div className="min-h-screen flex items-center justify-center p-6 pb-28" style={{ background: '#0a0a0f' }}>
      <div className="text-center">
        <BarChart2 size={48} className="mx-auto mb-4" style={{ color: 'rgba(234,179,8,0.2)' }} />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>No data yet</p>
        <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>Add films to your library to see stats</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen text-white pb-28" style={{ background: '#0a0a0f' }}>
      <div className="pt-10 pb-5 px-5 border-b" style={{ background: '#0d0d14', borderColor: 'rgba(234,179,8,0.12)' }}>
        <p style={{ fontSize: '0.52rem', textTransform: 'uppercase', letterSpacing: '0.3em', color: 'rgba(234,179,8,0.4)', fontFamily: "'Cinzel', serif" }}>The Ultimate Canon</p>
        <h1 style={{ fontFamily: "'Cinzel', serif", fontWeight: 700, fontSize: '1.4rem', color: '#fff', letterSpacing: '0.04em', marginTop: 4, lineHeight: 1.1 }}>Your Stats</h1>
        <p className="text-[9px] mt-1" style={{ color: 'rgba(255,255,255,0.2)' }}>by <span style={{ color: 'rgba(234,179,8,0.55)', fontWeight: 700 }}>Mahmudul Hasan Mahid</span></p>
      </div>

      <div className="px-4 pt-5 space-y-4">
        {/* Progress ring */}
        <div className="rounded-3xl p-5" style={cardStyle}>
          {sectionLabel('Overall Progress')}
          <div className="flex items-center gap-6">
            <CircularProgress pct={pct} label="done" sublabel={`${watched.length}/${total}`} />
            <div className="flex-1 space-y-3">
              <div>
                <div className="text-2xl font-black text-white">{watched.length}</div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Films Watched</div>
              </div>
              <div>
                <div className="text-lg font-black text-blue-400">{watchlist.length}</div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>In Watchlist</div>
              </div>
              <div>
                <div className="text-lg font-black" style={{ color: '#EAB308' }}>{watchHours}h <span className="text-sm font-bold" style={{ color: 'rgba(234,179,8,0.5)' }}>· {watchDays}d</span></div>
                <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Est. Watch Time</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick facts */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon:'❤️', val: favorites.length, label:'Favorites' },
            { icon:'⭐', val: rated.length,      label:'Rated' },
            { icon:'🏆', val:`${unlocked}/${achievements.length}`, label:'Achievements' },
          ].map(f => (
            <div key={f.label} className="rounded-2xl p-4 text-center" style={cardStyle}>
              <div className="text-xl mb-1">{f.icon}</div>
              <div className="text-lg font-black text-white">{f.val}</div>
              <div className="text-[9px] uppercase tracking-wider mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{f.label}</div>
            </div>
          ))}
        </div>

        {/* Taste */}
        {(favGenre || favIndustry) && (
          <div className="rounded-3xl p-5" style={cardStyle}>
            {sectionLabel('Your Taste')}
            <div className="flex gap-3">
              {favGenre && (
                <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#1a1a24' }}>
                  <div className="text-2xl mb-1">{GENRE_ICONS[favGenre] || '🎬'}</div>
                  <div className="text-xs font-black text-white">{favGenre}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Top Genre</div>
                </div>
              )}
              {favIndustry && (
                <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#1a1a24' }}>
                  <div className="text-2xl mb-1">{favIndInfo?.flag || '🌍'}</div>
                  <div className="text-xs font-black text-white">{favIndustry}</div>
                  <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Top Industry</div>
                </div>
              )}
              <div className="flex-1 rounded-2xl p-3 text-center" style={{ background: '#1a1a24' }}>
                <div className="text-2xl mb-1">{movies.filter(m => m.type === 'Movie').length > movies.filter(m => m.type === 'Series').length ? '🎬' : '📺'}</div>
                <div className="text-xs font-black text-white">{movies.filter(m => m.type === 'Movie').length > movies.filter(m => m.type === 'Series').length ? 'Movies' : 'Series'}</div>
                <div className="text-[9px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>Preference</div>
              </div>
            </div>
          </div>
        )}

        {/* Genre breakdown */}
        {topGenres.length > 0 && (
          <div className="rounded-3xl p-5" style={cardStyle}>
            {sectionLabel('By Genre')}
            <div className="space-y-3">
              {topGenres.map(({ genre, total: t, done }) => {
                const p = Math.round((done / t) * 100);
                return (
                  <div key={genre}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{GENRE_ICONS[genre] || '🎬'}</span>
                        <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{genre}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{done}/{t}</span>
                        <span className="text-[10px] font-bold ml-2" style={{ color: '#EAB308' }}>{p}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1c1c28' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, background: 'linear-gradient(90deg, #EAB308, #fde047)', boxShadow: '0 0 6px rgba(234,179,8,0.4)' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Industry breakdown */}
        {topIndustries.length > 0 && (
          <div className="rounded-3xl p-5" style={cardStyle}>
            {sectionLabel('By Industry')}
            <div className="space-y-3">
              {topIndustries.map(({ ind, total: t, done }) => {
                const p     = Math.round((done / t) * 100);
                const info  = INDUSTRIES.find(i => i.label === ind);
                const color = info?.bar || '#EAB308';
                return (
                  <div key={ind}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{info?.flag || '🌍'}</span>
                        <span className="text-xs font-bold" style={{ color: 'rgba(255,255,255,0.75)' }}>{ind}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>{done}/{t}</span>
                        <span className="text-[10px] font-bold ml-2" style={{ color }}>{p}%</span>
                      </div>
                    </div>
                    <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: '#1c1c28' }}>
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Rating distribution */}
        {rated.length > 0 && (
          <div className="rounded-3xl p-5" style={cardStyle}>
            {sectionLabel('Your Ratings')}
            <div className="flex items-end gap-2 h-20">
              {ratingDist.map(({ stars, count }) => (
                <div key={stars} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[9px] font-bold" style={{ color: 'rgba(255,255,255,0.4)' }}>{count}</span>
                  <div className="w-full rounded-t-lg relative overflow-hidden" style={{ height: `${Math.max((count / maxRatingCount) * 56, count > 0 ? 4 : 0)}px`, background: 'rgba(234,179,8,0.15)' }}>
                    <div className="absolute bottom-0 left-0 right-0 rounded-t-lg" style={{ height: '100%', background: 'linear-gradient(0deg, #EAB308, #fde047)' }} />
                  </div>
                  <div className="flex">{Array.from({ length: stars }).map((_, i) => <Star key={i} size={7} fill="#EAB308" stroke="none" />)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Rated */}
        {topRated.length > 0 && (
          <div className="rounded-3xl p-5" style={cardStyle}>
            {sectionLabel('🏆 Your Top Rated')}
            <div className="space-y-3">
              {topRated.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3">
                  <span className="text-sm font-black w-5" style={{ color: 'rgba(234,179,8,0.4)' }}>#{i + 1}</span>
                  {m.poster
                    ? <img src={m.poster} className="w-10 h-14 object-cover rounded-xl flex-shrink-0" alt="" />
                    : <div className="w-10 h-14 rounded-xl flex-shrink-0 flex items-center justify-center" style={{ background: '#1c1c28' }}><Film size={14} style={{ color: 'rgba(234,179,8,0.2)' }} /></div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate text-white">{m.title}</p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{m.year} · {m.type}</p>
                    <div className="flex gap-0.5 mt-0.5">{[1,2,3,4,5].map(s => <Star key={s} size={10} fill={s <= m.rating ? '#EAB308' : 'none'} stroke={s <= m.rating ? '#EAB308' : '#2d2d3a'} strokeWidth={1.5} />)}</div>
                  </div>
                  {INDUSTRIES.find(ind => ind.label === m.industry)?.flag && <span className="text-lg">{INDUSTRIES.find(ind => ind.label === m.industry).flag}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        <div className="rounded-3xl p-5" style={cardStyle}>
          {sectionLabel('Achievements')}
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.3)', marginTop: -10 }}>{unlocked} of {achievements.length} unlocked</p>
          <div className="grid grid-cols-2 gap-2">
            {achievements.map(a => (
              <div key={a.label}
                className="flex items-center gap-2.5 rounded-2xl p-3 transition-all"
                style={a.unlocked
                  ? { background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.25)' }
                  : { background: '#1a1a24', border: '1px solid rgba(255,255,255,0.04)', opacity: 0.4 }
                }>
                <span className="text-xl">{a.icon}</span>
                <div>
                  <p className="text-[11px] font-black text-white">{a.label}</p>
                  <p className="text-[9px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{a.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Movies vs Series */}
        <div className="rounded-3xl p-5 mb-2" style={cardStyle}>
          {sectionLabel('Movies vs Series')}
          {(() => {
            const mv    = movies.filter(m => m.type === 'Movie').length;
            const sv    = movies.filter(m => m.type === 'Series').length;
            const mvPct = total > 0 ? Math.round((mv / total) * 100) : 50;
            return (
              <div>
                <div className="flex rounded-full overflow-hidden h-3 mb-3" style={{ background: '#1c1c28' }}>
                  <div className="transition-all" style={{ width: `${mvPct}%`, background: 'linear-gradient(90deg, #EAB308, #fde047)' }} />
                  <div className="flex-1 bg-blue-600" />
                </div>
                <div className="flex justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#EAB308' }} />
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Movies <b className="text-white">{mv}</b></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                    <span style={{ color: 'rgba(255,255,255,0.5)' }}>Series <b className="text-white">{sv}</b></span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

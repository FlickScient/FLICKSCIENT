// @ts-nocheck
import { Film, Plus, BarChart2 } from 'lucide-react';
import BlobIcon from './BlobIcon';

export default function BottomNav({ view, setView }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl border-t"
      style={{ background: 'rgba(10,10,15,0.97)', borderColor: 'rgba(234,179,8,0.1)', boxShadow: '0 -8px 32px rgba(0,0,0,0.5)' }}>
      <div className="flex items-center justify-around py-2 px-2">
        <button onClick={() => setView('library')}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
          style={{ color: view === 'library' ? '#EAB308' : 'rgba(255,255,255,0.3)' }}>
          {view === 'library' && (
            <div className="absolute w-8 h-0.5 rounded-full -mt-2" style={{ background: '#EAB308', boxShadow: '0 0 8px rgba(234,179,8,0.8)', position: 'relative', top: -4, left: '50%', transform: 'translateX(-50%)' }} />
          )}
          <Film size={20} strokeWidth={view === 'library' ? 2.5 : 1.5} />
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>Library</span>
        </button>

        <button onClick={() => setView('flickscient')}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
          style={{ color: view === 'flickscient' ? '#a78bfa' : 'rgba(255,255,255,0.3)' }}>
          <BlobIcon size={24} />
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>AI</span>
        </button>

        <button onClick={() => setView('search')}
          className="rounded-full flex items-center justify-center transition-all active:scale-95 -mt-5"
          style={{ width: 52, height: 52, background: 'linear-gradient(135deg, #EAB308 0%, #ca9a07 100%)', boxShadow: '0 0 20px rgba(234,179,8,0.5), 0 4px 16px rgba(0,0,0,0.4)', color: '#000' }}>
          <Plus size={24} strokeWidth={2.5} />
        </button>

        <button onClick={() => setView('stats')}
          className="flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all"
          style={{ color: view === 'stats' ? '#EAB308' : 'rgba(255,255,255,0.3)' }}>
          <BarChart2 size={20} strokeWidth={view === 'stats' ? 2.5 : 1.5} />
          <span className="text-[9px] font-black uppercase tracking-wider" style={{ fontFamily: "'Cinzel', serif", letterSpacing: '0.1em' }}>Stats</span>
        </button>
      </div>
    </div>
  );
}

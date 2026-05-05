// @ts-nocheck
import { supabase } from './lib/supabase';
import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, RefreshCw, Clapperboard } from 'lucide-react';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
}

interface FlickScientProps {
  myList: any[];
}

export default function FlickScient({ myList }: FlickScientProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Yo. I'm FlickScient — the Final Boss of film knowledge. I've mentally watched everything so you don't have to. Tell me your exact vibe right now, and I'll drop a cinematic masterpiece on your radar. What are we feeling? 🎬",
    },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const watchedTitles   = myList.filter(m => m.watched || m.status === 'watched').map(m => m.title).join(', ');
  const favoriteTitles  = myList.filter(m => m.favorite).map(m => m.title).join(', ');
  const watchlistTitles = myList.filter(m => m.status === 'watchlist').map(m => m.title).join(', ');

  const handleSend = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!input.trim() || loading) return;

  const userQuery = input.trim();
  setInput('');
  setMessages(prev => [...prev, { id: Date.now().toString(), sender: 'user', text: userQuery }]);
  setLoading(true);

  try {
    const { data: authData } = await supabase.auth.getUser();
    const user = authData?.user || null;
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

    const response = await fetch(
      'https://rcdjmzxiectkckufyqyr.supabase.co/functions/v1/flick-scientist-bot',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey // 💡 Crucial key that lets your Netlify site pass the firewall!
        },
        body: JSON.stringify({
          prompt: `My Library: ${watchedTitles}. User Message: ${userQuery}`,
          userId: user?.id || null,
        }),
      }
    );

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Edge function error');

    setMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      sender: 'ai',
      // Added data.response here to ensure it perfectly catches the AI text payload
      text: data.response || data.message || data.reply || data.text || "My vision is a bit blurry. Try again?",
    }]);
  } catch (error: any) {
    console.error("AI Error:", error);
    setMessages(prev => [...prev, {
      id: 'err-' + Date.now(),
      sender: 'ai',
      text: "Oof. My cinematic brain just hit a buffer. Check your connection.",
    }]);
  } finally {
    setLoading(false);
  }
};


  const clearChat = () => {
    setMessages([{
      id: 'reset',
      sender: 'ai',
      text: "Amnesia activated. We're starting fresh. Hit me with a genre, a mood, or a weirdly specific hyper-fixation. 🎭",
    }]);
  };

  return (
    <div className="flex flex-col bg-[#0a0a0c] text-white" style={{ height: 'calc(100vh - 80px)' }}>

      {/* Header */}
      <div className="flex items-center justify-between bg-[#121218] border-b border-white/5 px-5 py-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
            <Clapperboard size={18} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="font-black text-sm text-purple-400 tracking-[0.15em] uppercase leading-tight">FlickScient</h3>
            <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">The Final Boss of Film</p>
          </div>
        </div>
        <button onClick={clearChat}
          className="text-gray-600 hover:text-purple-400 p-2 rounded-xl transition-all hover:bg-purple-500/10"
          title="Clear chat">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Context bar */}
      {myList.length > 0 && (
        <div className="px-5 py-2 bg-[#0f0f14] border-b border-white/5 flex items-center gap-2 flex-shrink-0">
          <Sparkles size={11} className="text-purple-500 flex-shrink-0" />
          <p className="text-[10px] text-gray-600 truncate">
            <span className="text-purple-600 font-bold">{myList.filter(m => m.watched || m.status === 'watched').length} watched</span>
            {' '}· <span className="text-blue-600 font-bold">{myList.filter(m => m.status === 'watchlist').length} in watchlist</span>
            {' '}· recommendations exclude your library
          </p>
        </div>
      )}

      {/* Chat pane */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5 bg-[#0d0d12]">
        {messages.map(msg => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs border shadow-lg ${
              msg.sender === 'user'
                ? 'bg-purple-500 border-purple-400 text-white font-black'
                : 'bg-[#16161d] border-purple-500/30 text-purple-400'
            }`}>
              {msg.sender === 'user' ? <User size={15} /> : <Sparkles size={15} />}
            </div>
            <div className={`flex-1 p-4 rounded-2xl text-[13px] leading-relaxed border whitespace-pre-wrap select-text ${
              msg.sender === 'user'
                ? 'bg-[#1a1a24] text-gray-100 border-white/5 font-medium rounded-tr-none ml-6'
                : 'bg-gradient-to-b from-[#121218] to-[#0f0f14] text-gray-200 border-white/5 rounded-tl-none mr-6 shadow-md'
            }`}>
              {msg.text.split(/(\*\*[^*]+\*\*)/).map((part, i) =>
                part.startsWith('**') && part.endsWith('**')
                  ? <strong key={i} className="text-yellow-400 font-black">{part.slice(2, -2)}</strong>
                  : part
              )}
            </div>
          </div>
        ))}

        {/* Loading dots */}
        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#16161d] border border-purple-500/30 flex items-center justify-center flex-shrink-0 text-purple-400">
              <Clapperboard size={15} className="animate-pulse" />
            </div>
            <div className="bg-[#121218] border border-white/5 p-4 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.2s]" />
              <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-[#121218] border-t border-white/5 flex-shrink-0">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            placeholder="Challenge me with a vibe, genre, mood…"
            className="w-full bg-[#0a0a0c] text-white p-4 pr-14 rounded-2xl border border-gray-800 outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20 transition-all text-[13px] placeholder-gray-600"
            value={input}
            onChange={e => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="absolute right-3 text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-all p-2.5 rounded-xl hover:bg-purple-500/10">
            <Send size={18} strokeWidth={2.5} />
          </button>
        </form>
      </div>
    </div>
  );
}

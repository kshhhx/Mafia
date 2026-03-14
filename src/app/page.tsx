'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/socketClient';
import HelpPanel from '@/components/HelpPanel';

export default function Home() {
  const router = useRouter();
  const { socket, error } = useGame();
  
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const lobbyFromUrl = params.get('lobby');
      if (lobbyFromUrl) {
        setJoinCode(lobbyFromUrl.toUpperCase());
        setMode('join');
      }
    }
  }, []);
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !socket) return;
    const sessionId = localStorage.getItem('mafia_sessionId')!;
    socket.emit('createLobby', { displayName: name, sessionId }, (lobbyId: string) => {
      router.push(`/${lobbyId}`);
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !joinCode || !socket) return;
    const sessionId = localStorage.getItem('mafia_sessionId')!;
    socket.emit('joinLobby', { lobbyId: joinCode.toUpperCase(), displayName: name, sessionId }, (success: boolean, msg?: string) => {
      if (success) {
        router.push(`/${joinCode.toUpperCase()}`);
      } else {
        alert(msg || 'Failed to join lobby');
      }
    });
  };

  if (mode === 'home') {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center p-6 fade-in overflow-hidden">
        <HelpPanel lobby={null} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(239,68,68,0.14),transparent_38%),linear-gradient(180deg,#09090b_0%,#111827_100%)]" />
        <div className="relative w-full max-w-md rounded-[2rem] border border-white/10 bg-black/35 backdrop-blur-xl p-7 shadow-2xl">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-gray-500 mb-3">Party Game Companion</p>
            <h1 className="text-5xl font-black tracking-tight mb-3 text-white">Mafia, without the chaos.</h1>
            <p className="text-gray-400 text-base leading-7">
              Start a room, bring everyone in, and let the app guide each phase one step at a time.
            </p>
          </div>

          <div className="flex flex-col space-y-3 w-full">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 rounded-2xl bg-mafiaRed text-white font-bold text-lg shadow-lg hover:bg-red-600 active:scale-95 transition-all"
            >
              Create Lobby
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 rounded-2xl bg-darkPanel text-white font-bold text-lg shadow-lg hover:bg-gray-700 active:scale-95 transition-all outline outline-1 outline-gray-700"
            >
              Join With Code
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center text-xs text-gray-500">
            <div className="rounded-2xl bg-white/5 px-3 py-3">Private role reveal</div>
            <div className="rounded-2xl bg-white/5 px-3 py-3">Guided night actions</div>
            <div className="rounded-2xl bg-white/5 px-3 py-3">Built-in rules help</div>
          </div>

          {error && <div className="mt-6 text-mafiaRed font-semibold text-sm">{error}</div>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center p-6 fade-in">
      <HelpPanel lobby={null} />
      <div className="w-full max-w-sm rounded-[2rem] border border-white/10 bg-black/30 backdrop-blur-xl p-6 shadow-2xl">
      <h1 className="text-4xl font-bold mb-8 text-center">
        {mode === 'create' ? 'Create Lobby' : 'Join Lobby'}
      </h1>
      <form onSubmit={mode === 'create' ? handleCreate : handleJoin} className="w-full max-w-xs flex flex-col space-y-4">
        
        <input 
          type="text" 
          placeholder="Your Display Name" 
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-4 rounded-xl bg-darkPanel text-white outline-none focus:ring-2 focus:ring-mafiaRed"
          required
        />
        
        {mode === 'join' && (
          <input 
            type="text" 
            placeholder="Room Code (e.g. ABCD)" 
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            className="w-full p-4 rounded-xl bg-darkPanel text-white outline-none focus:ring-2 focus:ring-mafiaRed uppercase"
            maxLength={4}
            required
          />
        )}
        
        <button 
          type="submit"
          className="w-full py-4 mt-4 rounded-2xl bg-mafiaRed text-white font-bold text-lg shadow-lg hover:bg-red-600 active:scale-95 transition-all"
        >
          {mode === 'create' ? 'Start Lobby' : 'Join Game'}
        </button>
        <button 
          type="button"
          onClick={() => setMode('home')}
          className="w-full py-4 rounded-xl text-gray-400 font-bold hover:text-white"
        >
          Back
        </button>
      </form>
      </div>
    </main>
  );
}

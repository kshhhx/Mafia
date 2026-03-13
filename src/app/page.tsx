'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/socketClient';

export default function Home() {
  const router = useRouter();
  const { socket, error } = useGame();
  
  const [name, setName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'home' | 'create' | 'join'>('home');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !socket) return;
    socket.emit('createLobby', name, (lobbyId: string) => {
      router.push(`/${lobbyId}`);
    });
  };

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !joinCode || !socket) return;
    socket.emit('joinLobby', joinCode.toUpperCase(), name, (success: boolean, msg?: string) => {
      if (success) {
        router.push(`/${joinCode.toUpperCase()}`);
      } else {
        alert(msg || 'Failed to join lobby');
      }
    });
  };

  if (mode === 'home') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-6 fade-in">
        <h1 className="text-6xl font-black tracking-tighter mb-2 text-mafiaRed drop-shadow-[0_0_15px_rgba(239,68,68,0.5)]">MAFIA</h1>
        <p className="text-gray-400 mb-12 text-center text-lg">The party game of trust and deception.</p>
        
        <div className="flex flex-col space-y-4 w-full max-w-xs">
          <button 
            onClick={() => setMode('create')}
            className="w-full py-4 rounded-xl bg-mafiaRed text-white font-bold text-lg shadow-lg hover:bg-red-600 active:scale-95 transition-all"
          >
            Create Lobby
          </button>
          <button 
            onClick={() => setMode('join')}
            className="w-full py-4 rounded-xl bg-darkPanel text-white font-bold text-lg shadow-lg hover:bg-gray-700 active:scale-95 transition-all outline outline-1 outline-gray-600"
          >
            Join Lobby
          </button>
        </div>
        
        {error && <div className="mt-8 text-mafiaRed font-semibold">{error}</div>}
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 fade-in">
      <h1 className="text-4xl font-bold mb-8">
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
          className="w-full py-4 mt-4 rounded-xl bg-mafiaRed text-white font-bold text-lg shadow-lg hover:bg-red-600 active:scale-95 transition-all"
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
    </main>
  );
}

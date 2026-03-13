'use client';

import { useState } from 'react';
import { useGame } from '@/lib/socketClient';

export default function NightPhaseView() {
  const { lobby, me, socket } = useGame();
  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  
  if (!lobby || !me || !socket) return null;

  const isAliveAndActive = (me.role === 'Mafia' || me.role === 'Doctor' || me.role === 'Detective') && me.isAlive;
  const alivePlayers = lobby.players.filter(p => p.isAlive);
  
  const handleLockIn = () => {
    if (selectedTarget) {
       socket.emit('submitNightAction', { lobbyId: lobby.lobbyId, targetId: selectedTarget });
    }
  };

  if (!isAliveAndActive) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center fade-in bg-black">
          <h2 className="text-4xl font-black mb-4 text-gray-500">Night Phase</h2>
          <p className="text-xl text-gray-400 mb-12">Shh... close your eyes.</p>
          <div className="w-16 h-16 border-4 border-gray-700 border-t-citizenBlue rounded-full animate-spin"></div>
        </div>
      );
  }

  return (
    <div className="flex flex-col p-6 max-w-md mx-auto min-h-screen fade-in bg-black pb-32">
       <div className="text-center mb-8 pt-8">
           <h2 className="text-4xl font-black text-white mb-2 tracking-wide">Night Phase</h2>
           <p className="text-gray-400">
             {me.role === 'Mafia' && 'Choose a citizen to eliminate.'}
             {me.role === 'Doctor' && 'Choose a player to save tonight.'}
             {me.role === 'Detective' && 'Choose a player to investigate.'}
           </p>
       </div>

       {me.nightAction ? (
          <div className="flex-1 flex flex-col items-center justify-center mt-20">
             <h3 className="text-2xl font-bold mb-4">Action locked.</h3>
             <p className="text-gray-500 animate-pulse">Waiting for other players...</p>
          </div>
       ) : (
          <div className="flex-1 flex flex-col">
             <div className="grid grid-cols-2 gap-4">
                {alivePlayers.map(p => {
                   // Logic: Mafia shouldn't usually target themselves for UX clarify, Doc can self save if setting allows (default false for MVP)
                   const isSelf = p.playerId === me.playerId;
                   if (isSelf && me.role === 'Mafia') return null; // Mafia shouldn't kill themselves
                   
                   return (
                     <button
                        key={p.playerId}
                        onClick={() => setSelectedTarget(p.playerId)}
                        className={`p-4 rounded-2xl flex flex-col items-center justify-center transition-all ${
                          selectedTarget === p.playerId 
                            ? (me.role === 'Mafia' ? 'bg-mafiaRed font-bold text-white shadow-lg shadow-mafiaRed/50 scale-105' : 'bg-citizenBlue font-bold text-white shadow-lg shadow-citizenBlue/50 scale-105')
                            : 'bg-darkPanel text-gray-300 hover:bg-gray-700'
                        }`}
                     >
                        <span className="text-lg">{p.displayName}</span>
                        {isSelf && <span className="text-xs opacity-75 mt-1">(You)</span>}
                     </button>
                   );
                })}
             </div>

             <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent flex justify-center pb-safe">
                <button
                  onClick={handleLockIn}
                  disabled={!selectedTarget}
                  className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all
                     ${selectedTarget ? 'bg-white text-black hover:bg-gray-200' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                >
                  Lock In Choice
                </button>
             </div>
          </div>
       )}
    </div>
  );
}

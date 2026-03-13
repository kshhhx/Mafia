'use client';

import { useGame } from '@/lib/socketClient';

export default function ResultView() {
  const { lobby, socket, me } = useGame();
  
  if (!lobby || !me || !socket) return null;

  const handleContinue = () => {
    socket.emit('continueToNextPhase', lobby.lobbyId);
  };

  const victimId = lobby.gameState.lastEliminated;
  const victim = victimId ? lobby.players.find(p => p.playerId === victimId) : null;

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-screen text-center fade-in bg-gradient-to-b from-red-900 to-darkerBg">
        <h2 className="text-xl font-bold text-red-300 uppercase tracking-widest mb-2">Verdict</h2>
        <h1 className="text-5xl font-black mb-12 text-white drop-shadow-md">Town Has Spoken</h1>

        <div className="bg-darkPanel/80 backdrop-blur pb-8 pt-8 px-6 rounded-3xl w-full max-w-sm mb-12 shadow-2xl border border-gray-700">
           {victim ? (
             <div className="flex flex-col items-center translate-y-2">
                <span className="text-6xl mb-4">⚖️</span>
                <p className="text-xl text-gray-300 mb-2">The town voted to eliminate</p>
                <h3 className="text-4xl font-black text-mafiaRed mb-4">{victim.displayName}</h3>
                
                {lobby.settings.revealRoleOnDeath && (
                  <p className="text-sm font-semibold text-gray-400 bg-gray-800 rounded px-3 py-1">
                    They were a {victim.role}
                  </p>
                )}
             </div>
           ) : (
             <div className="flex flex-col items-center translate-y-2">
                <span className="text-6xl mb-4">🏳️</span>
                <h3 className="text-3xl font-bold text-gray-300 mb-2">Tied or Skipped</h3>
                <p className="text-gray-400">Nobody was eliminated today.</p>
             </div>
           )}
        </div>

        <div className="w-full max-w-sm p-4 text-center mt-auto mb-8 text-gray-400">
           Night is approaching...
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-darkerBg via-darkerBg to-transparent flex justify-center pb-safe">
            {me.readyToContinue ? (
               <div className="text-gray-500 font-medium py-4">Waiting for others...</div>
            ) : (
               <button 
                  onClick={handleContinue}
                  className="w-full max-w-sm py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-gray-200 active:scale-95 transition-all outline outline-1 outline-gray-600"
                >
                  Proceed to Night
                </button>
            )}
        </div>
    </div>
  );
}

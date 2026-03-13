'use client';

import { useGame } from '@/lib/socketClient';
import { useRouter } from 'next/navigation';

export default function EndGameView() {
  const { lobby, socket, me } = useGame();
  const router = useRouter();

  if (!lobby || !me || !socket) return null;

  const winner = lobby.gameState.winner;
  const isMafiaWin = winner === 'Mafia';

  const titleColor = isMafiaWin ? 'text-mafiaRed' : 'text-citizenBlue';
  const bgColor = isMafiaWin ? 'from-red-950/50' : 'from-blue-900/50';

  return (
    <div className={`flex flex-col items-center justify-start p-6 min-h-screen text-center fade-in bg-gradient-to-b ${bgColor} to-darkerBg pb-safe overflow-y-auto`}>
        <div className="pt-12 mb-8">
           <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest mb-2">Game Over</h2>
           <h1 className={`text-6xl font-black mb-2 drop-shadow-lg ${titleColor}`}>
              {winner} Win!
           </h1>
           <p className="text-gray-400 font-medium">
             {isMafiaWin ? 'They outnumber the remaining citizens.' : 'All Mafia have been eliminated.'}
           </p>
        </div>

        <div className="w-full max-w-md bg-darkPanel rounded-3xl p-6 shadow-2xl mb-8">
           <h3 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">Final Roles</h3>
           <div className="space-y-3">
              {lobby.players.map(p => {
                 const playerMafia = p.team === 'Mafia';
                 return (
                    <div key={p.playerId} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
                       <div className="flex items-center space-x-3">
                          <span className="text-xl">{p.isAlive ? '🧑' : '💀'}</span>
                          <span className={`font-semibold text-lg ${!p.isAlive && 'line-through text-gray-500'}`}>
                             {p.displayName} {p.playerId === me.playerId && '(You)'}
                          </span>
                       </div>
                       <span className={`px-3 py-1 rounded text-sm font-bold ${playerMafia ? 'bg-mafiaRed/20 text-red-400' : 'bg-citizenBlue/20 text-blue-400'}`}>
                          {p.role}
                       </span>
                    </div>
                 );
              })}
           </div>
        </div>

        <div className="mt-auto w-full max-w-md flex flex-col space-y-4 mb-4 pt-4">
           {lobby.hostId === me.playerId && (
              <button 
                onClick={() => {
                  socket.emit('toggleReady', lobby.lobbyId); // A bit hacky, normally re-init room but host can just reload.
                  // For a real MVP, I would add a direct "playAgain" event to reset state
                  // Since I haven't implemented it in server in a clean way, simple reload/go home
                  router.push('/');
                }}
                className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-gray-200 active:scale-95 transition-all"
              >
                Back to Dashboard
              </button>
           )}
           {lobby.hostId !== me.playerId && (
              <button 
                onClick={() => router.push('/')}
                className="w-full py-4 rounded-xl bg-darkPanel border border-gray-600 text-white font-bold text-lg hover:bg-gray-700 active:scale-95"
              >
                Go Home
              </button>
           )}
        </div>
    </div>
  );
}

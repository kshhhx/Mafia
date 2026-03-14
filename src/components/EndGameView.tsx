'use client';

import { useGame } from '@/lib/socketClient';
import { useRouter } from 'next/navigation';

export default function EndGameView() {
  const { lobby, socket, me } = useGame();
  const router = useRouter();
  if (!lobby || !me || !socket) return null;

  const winner = lobby.gameState.winner;
  const colorClass = winner === 'Mafia' ? 'text-mafiaRed' : winner === 'Yakuza' ? 'text-yellow-300' : winner === 'Loner' ? 'text-emerald-300' : 'text-citizenBlue';

  return (
    <div className="flex flex-col items-center justify-start p-6 min-h-screen text-center fade-in bg-gradient-to-b from-black/40 to-darkerBg pb-safe overflow-y-auto">
      <div className="pt-12 mb-8">
        <h2 className="text-2xl font-bold text-gray-400 uppercase tracking-widest mb-2">Game Over</h2>
        <h1 className={`text-6xl font-black mb-2 drop-shadow-lg ${colorClass}`}>{winner} Win{winner === 'Draw' ? '' : '!'}</h1>
        <p className="text-gray-400 font-medium">Final roles are shown below{lobby.settings.mysteryMode ? ' because Mystery Mode hid them during the game.' : '.'}</p>
        <div className="mt-4 inline-block px-4 py-1 rounded-full bg-gray-800 border border-gray-700">
          <span className="text-sm text-gray-400 font-semibold tracking-wide">NIGHTS PLAYED: {lobby.gameState.roundNumber}</span>
        </div>
      </div>

      <div className="w-full max-w-md bg-darkPanel rounded-3xl p-6 shadow-2xl mb-8">
        <h3 className="text-xl font-bold border-b border-gray-700 pb-2 mb-4">Final Roles</h3>
        <div className="space-y-3">
          {lobby.players.map((player) => (
            <div key={player.playerId} className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{player.isAlive ? '🧑' : '💀'}</span>
                <span className={`font-semibold text-lg ${!player.isAlive ? 'line-through text-gray-500' : ''}`}>
                  {player.displayName} {player.playerId === me.playerId && '(You)'}
                </span>
              </div>
              <span className="px-3 py-1 rounded text-sm font-bold bg-white/10 text-white">{player.role}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-auto w-full max-w-md flex flex-col space-y-4 mb-4 pt-4">
        {lobby.hostId === me.playerId ? (
          <button onClick={() => socket.emit('playAgain', lobby.lobbyId)} className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-gray-200 active:scale-95 transition-all outline outline-1 outline-gray-400">
            Play Again (Same Lobby)
          </button>
        ) : (
          <button onClick={() => router.push('/')} className="w-full py-4 rounded-xl bg-darkPanel border border-gray-600 text-white font-bold text-lg hover:bg-gray-700 active:scale-95">
            Go Home
          </button>
        )}
      </div>
    </div>
  );
}

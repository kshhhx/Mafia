'use client';

import { useGame } from '@/lib/socketClient';
import type { RoleConfig } from '@/lib/types';

export default function LobbyView() {
  const { lobby, me, socket } = useGame();
  
  if (!lobby || !me || !socket) return null;
  
  const isHost = lobby.hostId === me.playerId;
  
  // Recommended config setups
  const applyRecommended = () => {
    const playerCount = lobby.players.length;
    let config: RoleConfig = { mafia: 1, doctor: 0, detective: 0, citizen: playerCount - 1 };
    
    if (playerCount >= 7 && playerCount <= 8) {
      config = { mafia: 2, doctor: 1, detective: 0, citizen: playerCount - 3 };
    } else if (playerCount >= 9 && playerCount <= 10) {
      config = { mafia: 2, doctor: 1, detective: 1, citizen: playerCount - 4 };
    } else if (playerCount >= 11) {
      config = { mafia: 3, doctor: 1, detective: 1, citizen: playerCount - 5 };
    }
    socket.emit('updateRoleConfig', { lobbyId: lobby.lobbyId, config });
  };

  const handleStart = () => {
    socket.emit('startGame', lobby.lobbyId);
  };

  const totalRoles = lobby.roleConfig.mafia + lobby.roleConfig.doctor + lobby.roleConfig.detective + lobby.roleConfig.citizen;
  const isBalanced = totalRoles === lobby.players.length;
  const isMafiaAdvantage = lobby.roleConfig.mafia >= (lobby.roleConfig.citizen + lobby.roleConfig.doctor + lobby.roleConfig.detective);

  return (
    <div className="flex flex-col p-6 max-w-md mx-auto fade-in">
      <div className="text-center mb-8">
        <h2 className="text-gray-400 font-semibold tracking-widest uppercase text-xs">Room Code</h2>
        <h1 className="text-5xl font-black tracking-widest text-mafiaRed">{lobby.lobbyId}</h1>
      </div>

      <div className="bg-darkPanel rounded-2xl p-4 mb-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Players ({lobby.players.length})</h3>
        <ul className="space-y-3">
          {lobby.players.map(p => (
             <li key={p.playerId} className="flex items-center justify-between">
               <span className="font-medium text-lg flex items-center">
                 {p.displayName} {p.playerId === lobby.hostId && <span className="text-yellow-500 text-sm ml-2">👑</span>}
               </span>
               <div className="flex items-center space-x-3">
                 <span className={`text-sm ${p.isReady ? 'text-green-400' : 'text-gray-500'}`}>
                   {p.isReady ? 'Ready' : 'Waiting'}
                 </span>
                 {isHost && p.playerId !== lobby.hostId && (
                   <button 
                     onClick={() => socket.emit('kickPlayer', { lobbyId: lobby.lobbyId, targetId: p.playerId })}
                     className="text-xs text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                   >
                     Kick
                   </button>
                 )}
               </div>
             </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="bg-darkPanel rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <h3 className="text-lg font-bold">Roles Setup</h3>
            <button onClick={applyRecommended} className="text-xs bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600 transition-colors">
              Auto-fill
            </button>
          </div>
          
          <div className="space-y-4">
            {['mafia', 'doctor', 'detective', 'citizen'].map((r) => (
               <div key={r} className="flex items-center justify-between">
                  <span className="capitalize font-medium">{r}</span>
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => {
                         const current = lobby.roleConfig[r as keyof RoleConfig];
                         if (current > 0) {
                           socket.emit('updateRoleConfig', { lobbyId: lobby.lobbyId, config: { ...lobby.roleConfig, [r]: current - 1 }});
                         }
                      }}
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 active:scale-95"
                    >-</button>
                    <span className="w-4 text-center font-bold">{lobby.roleConfig[r as keyof RoleConfig]}</span>
                    <button 
                      onClick={() => {
                         const current = lobby.roleConfig[r as keyof RoleConfig];
                         socket.emit('updateRoleConfig', { lobbyId: lobby.lobbyId, config: { ...lobby.roleConfig, [r]: current + 1 }});
                      }}
                      className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 active:scale-95"
                    >+</button>
                  </div>
               </div>
            ))}
          </div>
          
          {!isBalanced && (
            <div className="mt-4 text-xs text-red-400 bg-red-400/10 p-2 rounded text-center">
              Roles assigned ({totalRoles}) must equal players ({lobby.players.length}).
            </div>
          )}
          {isBalanced && isMafiaAdvantage && (
            <div className="mt-4 text-xs text-yellow-500 bg-yellow-500/10 p-2 rounded text-center">
              ⚠️ Warning: Mafia equals or outnumbers the town.
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-8 flex flex-col space-y-4">
        <button 
          onClick={() => socket.emit('toggleReady', lobby.lobbyId)}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all outline outline-1 outline-gray-600 ${
            me.isReady ? 'bg-green-600 text-white' : 'bg-darkPanel text-gray-300'
          }`}
        >
          {me.isReady ? 'Ready!' : 'Mark Ready'}
        </button>
        
        {isHost && (
          <button 
            onClick={handleStart}
            disabled={!isBalanced}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all
               ${isBalanced ? 'bg-mafiaRed text-white hover:bg-red-600 cursor-pointer' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useGame } from '@/lib/socketClient';

export default function RoleRevealView() {
  const { lobby, me, socket } = useGame();
  const [revealed, setRevealed] = useState(false);
  
  if (!lobby || !me || !socket) return null;

  const handleContinue = () => {
    socket.emit('continueToNextPhase', lobby.lobbyId);
  };

  const isMafia = me.role === 'Mafia';
  const mafiaTeammates = isMafia ? lobby.players.filter(p => p.role === 'Mafia' && p.playerId !== me.playerId) : [];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      {!revealed ? (
         <div 
           onClick={() => setRevealed(true)}
           className="w-64 h-96 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-gray-700 flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105 transition-all duration-300"
         >
            <span className="text-gray-400 font-bold uppercase tracking-widest">Tap to Reveal</span>
         </div>
      ) : (
         <div className="w-full max-w-sm flex flex-col items-center justify-center fade-in">
            <h2 className="text-gray-400 text-sm font-semibold tracking-widest uppercase mb-4">Your Role Is</h2>
            
            <div className={`w-full py-12 rounded-3xl flex flex-col items-center justify-center mb-8 shadow-2xl border
               ${me.team === 'Mafia' ? 'bg-red-900/20 shadow-red-900/50 border-mafiaRed' : 'bg-blue-900/20 shadow-blue-900/50 border-citizenBlue'}`}>
               <h1 className={`text-6xl font-black mb-2 ${me.team === 'Mafia' ? 'text-mafiaRed' : 'text-citizenBlue'}`}>
                 {me.role}
               </h1>
               <span className="text-gray-300 font-medium tracking-wide uppercase text-sm">Team {me.team}</span>
            </div>

            <div className="bg-darkPanel p-6 rounded-2xl w-full text-center space-y-4 mb-8">
               {me.role === 'Citizen' && (
                 <>
                   <p>You have no special powers. Use your intuition to find the Mafia!</p>
                   <p className="text-sm text-green-400 mt-2 font-semibold">Win Condition: Eliminate all Mafia.</p>
                 </>
               )}
               {me.role === 'Mafia' && (
                 <>
                   <p>Eliminate the citizens at night. Don't get caught.</p>
                   <p className="text-sm text-green-400 mt-2 font-semibold">Win Condition: Equal or outnumber the Citizens.</p>
                   {mafiaTeammates.length > 0 && (
                     <div className="mt-4 p-4 bg-red-950/40 rounded-xl border border-red-900/30">
                       <p className="text-sm text-gray-400 mb-2 font-semibold">Your Teammates:</p>
                       <div className="flex flex-wrap justify-center gap-2">
                         {mafiaTeammates.map(m => (
                           <span key={m.playerId} className="px-3 py-1 bg-mafiaRed/20 text-red-300 rounded text-sm font-medium">
                             {m.displayName}
                           </span>
                         ))}
                       </div>
                     </div>
                   )}
                 </>
               )}
               {me.role === 'Doctor' && (
                 <>
                   <p>Each night, choose a player to protect from the Mafia.</p>
                   <p className="text-sm text-green-400 mt-2 font-semibold">Win Condition: Eliminate all Mafia.</p>
                 </>
               )}
               {me.role === 'Detective' && (
                 <>
                   <p>Each night, investigate a player to discover if they are Mafia.</p>
                   <p className="text-sm text-green-400 mt-2 font-semibold">Win Condition: Eliminate all Mafia.</p>
                 </>
               )}
            </div>

            {me.readyToContinue ? (
              <div className="text-gray-500 font-medium animate-pulse">Waiting for other players...</div>
            ) : (
              <div className="w-full space-y-3">
                <button 
                  onClick={() => setRevealed(false)}
                  className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-bold text-md shadow-lg hover:bg-gray-700 active:scale-95 transition-all outline outline-1 outline-gray-600"
                >
                  Hide Role
                </button>
                <button 
                  onClick={handleContinue}
                  className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-gray-200 active:scale-95 transition-all"
                >
                  Ready, Continue
                </button>
              </div>
            )}
         </div>
      )}
    </div>
  );
}

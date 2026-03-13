'use client';

import { useGame } from '@/lib/socketClient';

export default function DayPhaseView() {
  const { lobby, socket, me } = useGame();
  
  if (!lobby || !me || !socket) return null;

  const handleContinue = () => {
    socket.emit('continueToNextPhase', lobby.lobbyId);
  };

  const nightDeathId = lobby.gameState.nightDeath;
  const victim = nightDeathId ? lobby.players.find(p => p.playerId === nightDeathId) : null;

  // Show detective results only to the detective
  const isDetective = me.role === 'Detective' && me.isAlive;
  const detResult = me.detectiveResult;
  let detTargetName = null;
  if (isDetective && detResult) {
      detTargetName = lobby.players.find(p => p.playerId === detResult.targetId)?.displayName;
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-screen text-center fade-in bg-gradient-to-b from-blue-900 to-darkerBg">
        <h2 className="text-xl font-bold text-blue-300 uppercase tracking-widest mb-2">Morning Has Arrived</h2>
        <h1 className="text-5xl font-black mb-12 text-white drop-shadow-md">Day {lobby.gameState.roundNumber}</h1>

        <div className="bg-darkPanel/80 backdrop-blur pb-8 pt-8 px-6 rounded-3xl w-full max-w-sm mb-8 shadow-2xl border border-gray-700">
           {victim ? (
             <div className="flex flex-col items-center">
                <span className="text-6xl mb-4">💀</span>
                <p className="text-xl text-gray-300 mb-2">Last night, the Mafia eliminated</p>
                <h3 className="text-4xl font-black text-mafiaRed mb-4">{victim.displayName}</h3>
                
                {lobby.settings.revealRoleOnDeath && (
                  <p className="text-sm font-semibold text-gray-400 bg-gray-800 rounded px-3 py-1">
                    They were a {victim.role}
                  </p>
                )}
             </div>
           ) : (
             <div className="flex flex-col items-center">
                <span className="text-6xl mb-4">🛡️</span>
                <h3 className="text-3xl font-bold text-green-400 mb-2">Nobody died</h3>
                <p className="text-gray-300">The Doctor successfully saved the target.</p>
             </div>
           )}
        </div>

        {isDetective && detResult && detTargetName && (
           <div className="bg-blue-900/50 border border-blue-500 rounded-2xl p-4 mb-8 w-full max-w-sm text-center">
               <h4 className="text-blue-300 font-bold uppercase text-xs mb-2">Detective Investigation</h4>
               <p className="text-lg">
                  You discovered that <span className="font-bold text-white">{detTargetName}</span> is 
                  {detResult.isMafia ? <span className="text-mafiaRed font-black ml-1"> MAFIA</span> : <span className="text-citizenBlue font-black ml-1"> NOT MAFIA</span>}.
               </p>
           </div>
        )}

        <div className="w-full max-w-sm p-4 text-center mt-auto mb-8 text-gray-400">
           Discuss with the group over who to vote out!
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-darkerBg via-darkerBg to-transparent flex justify-center pb-safe">
            {me.readyToContinue ? (
               <div className="text-gray-500 font-medium py-4 px-8 mt-4">Waiting for others to finish discussing...</div>
            ) : (
               <button 
                  onClick={handleContinue}
                  className="w-full max-w-sm py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-gray-200 active:scale-95 transition-all outline outline-1 outline-gray-600"
                >
                  Proceed to Voting
                </button>
            )}
        </div>
    </div>
  );
}

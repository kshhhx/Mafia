'use client';

import { useState } from 'react';
import { useGame } from '@/lib/socketClient';

export default function VotingPhaseView() {
  const { lobby, me, socket } = useGame();
  const [selectedVote, setSelectedVote] = useState<string | null>(null);

  if (!lobby || !me || !socket) return null;

  const alivePlayers = lobby.players.filter(p => p.isAlive);
  const handleVote = () => {
     if (selectedVote) {
         socket.emit('submitVote', { lobbyId: lobby.lobbyId, targetId: selectedVote });
     }
  };

  const myVoteLocked = me.currentVote !== null;

  if (!me.isAlive) {
      return (
          <div className="flex flex-col items-center justify-center p-6 min-h-screen">
             <h2 className="text-3xl font-bold text-gray-500 mb-4">Voting Phase</h2>
             <p className="text-gray-400 text-center text-lg">You are dead. You may spectate the vote but cannot participate.</p>
             <p className="mt-8 text-sm text-gray-600 animate-pulse">Waiting for the town to decide...</p>
          </div>
      );
  }

  return (
    <div className="flex flex-col p-6 max-w-md mx-auto min-h-screen fade-in pb-32">
       <div className="text-center mb-6 pt-6 border-b border-gray-800 pb-4">
           <h2 className="text-3xl font-black text-white mb-2">Town Vote</h2>
           <p className="text-gray-400">Select one player to eliminate.</p>
       </div>

       {myVoteLocked ? (
          <div className="flex-1 flex flex-col items-center justify-center">
             <div className="bg-darkPanel p-8 rounded-full border-4 border-gray-700 shadow-2xl mb-6">
                <span className="text-4xl">🗳️</span>
             </div>
             <h3 className="text-2xl font-bold mb-2">Vote Locked</h3>
             <p className="text-gray-500 animate-pulse">Waiting for other players to vote...</p>
          </div>
       ) : (
          <div className="flex-1 flex flex-col space-y-3 mt-4">
             {alivePlayers.map(p => {
                 const isSelf = p.playerId === me.playerId;
                 return (
                    <button
                        key={p.playerId}
                        onClick={() => setSelectedVote(p.playerId)}
                        className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                          selectedVote === p.playerId 
                            ? 'bg-white text-black font-bold scale-[1.02] shadow-[0_0_20px_rgba(255,255,255,0.2)]'
                            : 'bg-darkPanel text-gray-200 hover:bg-gray-700'
                        }`}
                     >
                        <span className="text-lg">{p.displayName}</span>
                        {isSelf && <span className="text-xs opacity-75">(You)</span>}
                     </button>
                 );
             })}
             
             <button
                 onClick={() => setSelectedVote('skip')}
                 className={`p-4 rounded-xl flex items-center justify-center mt-4 transition-all border-2 border-dashed ${
                   selectedVote === 'skip'
                     ? 'border-white text-white font-bold bg-white/10'
                     : 'border-gray-600 text-gray-500 hover:text-gray-300'
                 }`}
             >
                 Skip Vote
             </button>
          </div>
       )}

       {!myVoteLocked && (
          <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-darkerBg via-darkerBg to-transparent flex justify-center pb-safe">
             <button
               onClick={handleVote}
               disabled={!selectedVote}
               className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all
                  ${selectedVote ? 'bg-mafiaRed text-white hover:bg-red-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
             >
               Cast Vote
             </button>
          </div>
       )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useGame } from '@/lib/socketClient';

export default function VotingPhaseView() {
  const { lobby, me, socket } = useGame();
  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [submittingVote, setSubmittingVote] = useState(false);

  if (!lobby || !me || !socket) return null;

  useEffect(() => {
    if (me.currentVote !== null && submittingVote) {
      setSubmittingVote(false);
    }
  }, [me.currentVote, submittingVote]);

  const alivePlayers = lobby.players.filter((player) => player.isAlive);
  const myVoteLocked = me.currentVote !== null;
  const cannotVote = !me.isAlive || me.isJailed || me.isSilenced;
  const hypnotist = me.hypnotizedBy ? lobby.players.find((player) => player.playerId === me.hypnotizedBy) : null;

  if (cannotVote) {
    return (
      <div className="flex flex-col items-center justify-center p-6 min-h-screen">
        <h2 className="text-3xl font-bold text-gray-500 mb-4">Voting Phase</h2>
        <p className="text-gray-400 text-center text-lg">
          {!me.isAlive ? 'You are dead and cannot vote.' : me.isJailed ? 'You are jailed and cannot vote today.' : 'You were silenced and cannot vote today.'}
        </p>
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

      {hypnotist && (
        <div className="mb-4 rounded-2xl border border-blue-500/40 bg-blue-900/20 p-4 text-sm text-blue-100 text-center">
          You were hypnotized last night. Your vote will count the same way as {hypnotist.displayName}&apos;s vote.
        </div>
      )}

      {myVoteLocked ? (
        <div className="flex-1 flex flex-col items-center justify-center mt-12">
          <div className="bg-darkPanel p-8 rounded-full border-4 border-gray-700 shadow-2xl mb-6 relative">
            <span className="text-4xl">🗳️</span>
          </div>
          <h3 className="text-3xl font-bold mb-2 text-white">Vote Locked</h3>
          <p className="text-gray-500 text-lg animate-pulse text-center px-4">Waiting for the rest of the table to cast their votes...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-3 mt-4">
          {alivePlayers.map((player) => (
            <button
              key={player.playerId}
              onClick={() => setSelectedVote(player.playerId)}
              className={`p-4 rounded-xl flex items-center justify-between transition-all ${
                selectedVote === player.playerId ? 'bg-white text-black font-bold scale-[1.02]' : 'bg-darkPanel text-gray-200 hover:bg-gray-700'
              }`}
            >
              <span className="text-lg">{player.displayName}</span>
              {player.playerId === me.playerId && <span className="text-xs opacity-75">(You)</span>}
            </button>
          ))}

          <button
            onClick={() => setSelectedVote('skip')}
            className={`p-4 rounded-xl flex items-center justify-center mt-4 transition-all border-2 border-dashed ${
              selectedVote === 'skip' ? 'border-white text-white font-bold bg-white/10' : 'border-gray-600 text-gray-500 hover:text-gray-300'
            }`}
          >
            Abstain
          </button>
        </div>
      )}

      {!myVoteLocked && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-darkerBg via-darkerBg to-transparent flex justify-center pb-safe">
          <button
            onClick={() => {
              if (!selectedVote) return;
              setSubmittingVote(true);
              socket.emit('submitVote', { lobbyId: lobby.lobbyId, targetId: selectedVote });
            }}
            disabled={!selectedVote || submittingVote}
            className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all ${
              selectedVote && !submittingVote ? 'bg-mafiaRed text-white hover:bg-red-600' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {submittingVote ? 'Vote Received...' : 'Cast Vote'}
          </button>
        </div>
      )}
    </div>
  );
}

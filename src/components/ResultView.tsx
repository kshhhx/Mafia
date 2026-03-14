'use client';

import { useGame } from '@/lib/socketClient';

export default function ResultView() {
  const { lobby, me } = useGame();
  if (!lobby || !me) return null;

  const victim = lobby.gameState.lastEliminated ? lobby.players.find((player) => player.playerId === lobby.gameState.lastEliminated) : null;
  const shouldRevealRoles = lobby.settings.revealRoleOnDeath && !lobby.settings.mysteryMode;
  const voteTotals = Object.entries(lobby.gameState.voteResults)
    .map(([targetId, total]) => ({
      targetId,
      total,
      label: targetId === 'skip' ? 'Abstain' : lobby.players.find((player) => player.playerId === targetId)?.displayName || 'Unknown',
    }))
    .sort((left, right) => right.total - left.total);
  const voteBreakdown = Object.entries(lobby.gameState.voteBreakdown).map(([playerId, targetId]) => ({
    voter: lobby.players.find((player) => player.playerId === playerId)?.displayName || 'Unknown',
    target: targetId === 'skip' ? 'Abstain' : lobby.players.find((player) => player.playerId === targetId)?.displayName || 'Unknown',
  }));

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
            {shouldRevealRoles && <p className="text-sm font-semibold text-gray-400 bg-gray-800 rounded px-3 py-1">They were a {victim.role}</p>}
            {lobby.settings.mysteryMode && <p className="text-sm text-gray-500">Mystery Mode keeps role cards hidden until the game ends.</p>}
          </div>
        ) : (
          <div className="flex flex-col items-center translate-y-2">
            <span className="text-6xl mb-4">🏳️</span>
            <h3 className="text-3xl font-bold text-gray-300 mb-2">Tied or Abstained</h3>
            <p className="text-gray-400">Nobody was eliminated today.</p>
          </div>
        )}
      </div>

      {voteTotals.length > 0 && (
        <div className="w-full max-w-sm rounded-3xl border border-gray-700 bg-black/20 p-4 mb-6 text-left">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Vote Totals</h3>
          <div className="space-y-2">
            {voteTotals.map((entry) => (
              <div key={entry.targetId} className="flex items-center justify-between rounded-2xl bg-white/5 px-4 py-3 text-sm text-gray-200">
                <span>{entry.label}</span>
                <span className="font-bold">{entry.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!lobby.settings.mysteryMode && voteBreakdown.length > 0 && (
        <div className="w-full max-w-sm rounded-3xl border border-gray-700 bg-black/20 p-4 mb-6 text-left">
          <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Who Voted For Whom</h3>
          <div className="space-y-2">
            {voteBreakdown.map((entry) => (
              <div key={`${entry.voter}-${entry.target}`} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-gray-200">
                {entry.voter} voted for {entry.target}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-sm p-4 text-center mt-auto mb-8 text-gray-400">Night is approaching...</div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-darkerBg via-darkerBg to-transparent flex justify-center pb-safe">
        <div className="w-full max-w-sm rounded-2xl bg-black/20 px-6 py-4 text-center text-sm text-gray-400">
          Wait for the moderator to begin the next night.
        </div>
      </div>
    </div>
  );
}

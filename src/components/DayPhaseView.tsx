'use client';

import { useGame } from '@/lib/socketClient';

export default function DayPhaseView() {
  const { lobby, me } = useGame();
  if (!lobby || !me) return null;

  const nightVictims = lobby.gameState.nightDeaths
    .map((playerId) => lobby.players.find((player) => player.playerId === playerId))
    .filter((player): player is NonNullable<typeof player> => Boolean(player));

  const shouldRevealRoles = lobby.settings.revealRoleOnDeath && !lobby.settings.mysteryMode;

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-screen text-center fade-in bg-gradient-to-b from-blue-900 to-darkerBg">
      <h2 className="text-xl font-bold text-blue-300 uppercase tracking-widest mb-2">Morning Has Arrived</h2>
      <h1 className="text-5xl font-black mb-8 text-white drop-shadow-md">Day {lobby.gameState.roundNumber}</h1>

      <div className="bg-darkPanel/80 backdrop-blur pb-8 pt-8 px-6 rounded-3xl w-full max-w-sm mb-6 shadow-2xl border border-gray-700">
        {nightVictims.length > 0 ? (
          <div className="flex flex-col items-center gap-5">
            <span className="text-6xl">💀</span>
            <p className="text-xl text-gray-300">Overnight, these players were eliminated:</p>
            <div className="w-full space-y-4">
              {nightVictims.map((victim) => (
                <div key={victim.playerId} className="bg-black/20 rounded-2xl p-4">
                  <h3 className="text-3xl font-black text-mafiaRed mb-2">{victim.displayName}</h3>
                  {shouldRevealRoles && (
                    <p className="text-sm font-semibold text-gray-400 bg-gray-800 rounded px-3 py-1 inline-block">
                      They were a {victim.role}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <span className="text-6xl mb-4">🌙</span>
            <h3 className="text-3xl font-bold text-green-400 mb-2">Nobody died</h3>
            <p className="text-gray-300">{lobby.gameState.roundNumber === 1 ? 'The opening night never has any deaths.' : 'Protections, blocks, or indecision kept everyone alive.'}</p>
          </div>
        )}
      </div>

      {lobby.gameState.dawnAnnouncements.length > 0 && (
        <div className="w-full max-w-sm bg-black/20 border border-gray-700 rounded-2xl p-4 mb-6 text-left">
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Dawn Announcements</h4>
          <div className="space-y-2 text-sm text-gray-200">
            {lobby.gameState.dawnAnnouncements.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        </div>
      )}

      {me.investigationResult?.message && (
        <div className="bg-blue-900/50 border border-blue-500 rounded-2xl p-4 mb-6 w-full max-w-sm text-center">
          <h4 className="text-blue-300 font-bold uppercase text-xs mb-2">Night Result</h4>
          <p className="text-lg">{me.investigationResult.message}</p>
        </div>
      )}

      {me.investigationResult?.role && me.investigationResult.targetId && (
        <div className="bg-blue-900/50 border border-blue-500 rounded-2xl p-4 mb-6 w-full max-w-sm text-center">
          <h4 className="text-blue-300 font-bold uppercase text-xs mb-2">Investigation Result</h4>
          <p className="text-lg">
            {lobby.players.find((player) => player.playerId === me.investigationResult?.targetId)?.displayName} is the <span className="font-bold text-white">{me.investigationResult.role}</span>.
          </p>
        </div>
      )}

      {me.investigationResult?.compareTargetIds && (
        <div className="bg-blue-900/50 border border-blue-500 rounded-2xl p-4 mb-6 w-full max-w-sm text-center">
          <h4 className="text-blue-300 font-bold uppercase text-xs mb-2">Journalist Result</h4>
          <p className="text-lg">{me.investigationResult.message}</p>
        </div>
      )}

      <div className="w-full max-w-sm p-4 text-center mt-auto mb-8 text-gray-400">
        Debate, nominate suspects, and prepare for the day vote.
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-darkerBg via-darkerBg to-transparent flex justify-center pb-safe">
        <div className="w-full max-w-sm rounded-2xl bg-black/20 px-6 py-4 text-center text-sm text-gray-400">
          Wait for the moderator to open voting when discussion is finished.
        </div>
      </div>
    </div>
  );
}

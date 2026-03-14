'use client';

import { useState } from 'react';
import { useGame } from '@/lib/socketClient';

const ROLE_COPY: Record<string, string> = {
  Bystander: 'No night ability. You win by helping the civilians eliminate all criminal teams.',
  Nurse: 'Protect one player from dying each night.',
  Bodyguard: 'Protect one player. If they would die, you die instead.',
  Vixen: 'Block one player’s ability and make them immune to death that night.',
  Hypnotist: 'Choose a player whose vote will follow yours on the next day.',
  Journalist: 'Compare two players to learn whether they are on the same team.',
  Detective: 'Each night, either investigate or kill a player.',
  Jailer: 'Investigate a player and jail them if they are Mafia or Yakuza.',
  Priest: 'Each night, either investigate or kill a player. Investigated players learn who you are.',
  Judge: 'Investigate one player each night. Your daytime vote counts twice.',
  Sheriff: 'Kill one player at night.',
  Thug: 'No personal ability. You help the Mafia choose the nightly victim.',
  Thief: 'Join the Mafia kill and block one player’s ability.',
  Lawyer: 'Join the Mafia kill and investigate one player.',
  Godfather: 'Join the Mafia kill and silence one player for the next day vote.',
  Snitch: 'Join the Mafia kill and badmouth one player so investigations read them as a Thug.',
  Yakuza: 'You are part of a separate criminal team that kills at night after the Mafia.',
  FemmeFatale: 'Kill one player each night, but Bystanders survive your attack.',
  Impostor: 'Pretend to be a Mafia Thug and participate in the Mafia vote while secretly playing for yourself.',
  Psycho: 'Kill one player each night while trying to survive as the Loner.',
};

export default function RoleRevealView() {
  const { lobby, me, socket } = useGame();
  const [revealed, setRevealed] = useState(false);

  if (!lobby || !me || !socket || !me.role || !me.team) return null;

  const teammates = lobby.players.filter(
    (player) => player.playerId !== me.playerId && player.team === me.team && (me.team === 'Mafia' || me.team === 'Yakuza'),
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 fade-in">
      {!revealed ? (
        <div onClick={() => setRevealed(true)} className="w-64 h-96 bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl shadow-[0_0_30px_rgba(0,0,0,0.5)] border border-gray-700 flex items-center justify-center cursor-pointer active:scale-95 hover:scale-105 transition-all duration-300">
          <span className="text-gray-400 font-bold uppercase tracking-widest">Tap to Reveal</span>
        </div>
      ) : (
        <div className="w-full max-w-sm flex flex-col items-center justify-center fade-in">
          <h2 className="text-gray-400 text-sm font-semibold tracking-widest uppercase mb-4">Your Role Is</h2>

          <div className={`w-full py-12 rounded-3xl flex flex-col items-center justify-center mb-8 shadow-2xl border ${
            me.team === 'Mafia' ? 'bg-red-900/20 shadow-red-900/50 border-mafiaRed' : me.team === 'Yakuza' ? 'bg-yellow-200/10 shadow-yellow-200/20 border-yellow-400/40' : me.team === 'Loner' ? 'bg-emerald-900/20 shadow-emerald-900/50 border-emerald-500/40' : 'bg-blue-900/20 shadow-blue-900/50 border-citizenBlue'
          }`}>
            <h1 className={`text-5xl font-black mb-2 ${
              me.team === 'Mafia' ? 'text-mafiaRed' : me.team === 'Yakuza' ? 'text-yellow-300' : me.team === 'Loner' ? 'text-emerald-300' : 'text-citizenBlue'
            }`}>
              {me.role}
            </h1>
            <span className="text-gray-300 font-medium tracking-wide uppercase text-sm">Team {me.team}</span>
          </div>

          <div className="bg-darkPanel p-6 rounded-2xl w-full text-center space-y-4 mb-8">
            <p>{ROLE_COPY[me.role]}</p>
            {teammates.length > 0 && (
              <div className="mt-4 p-4 bg-red-950/40 rounded-xl border border-red-900/30">
                <p className="text-sm text-gray-400 mb-2 font-semibold">Your teammates:</p>
                <div className="flex flex-wrap justify-center gap-2">
                  {teammates.map((player) => (
                    <span key={player.playerId} className="px-3 py-1 bg-mafiaRed/20 text-red-300 rounded text-sm font-medium">
                      {player.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {lobby.gameState.firstNight && <p className="text-xs text-gray-400">Opening night begins immediately after everyone is ready. Mafia and any active roles will act before the first day begins.</p>}
          </div>

          {me.readyToContinue ? (
            <div className="text-gray-500 font-medium animate-pulse">Waiting for other players...</div>
          ) : (
            <div className="w-full space-y-3">
              <button onClick={() => setRevealed(false)} className="w-full py-3 rounded-xl bg-gray-800 text-gray-300 font-bold text-md shadow-lg hover:bg-gray-700 active:scale-95 transition-all outline outline-1 outline-gray-600">
                Hide Role
              </button>
              <button onClick={() => socket.emit('continueToNextPhase', lobby.lobbyId)} className="w-full py-4 rounded-xl bg-white text-black font-bold text-lg shadow-lg hover:bg-gray-200 active:scale-95 transition-all">
                Ready, Continue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

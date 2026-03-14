'use client';

import { useMemo, useState } from 'react';
import { useGame } from '@/lib/socketClient';
import type { AbilityAction, Player } from '@/lib/types';

function roleInstructions(role: Player['role'], firstNight: boolean) {
  switch (role) {
    case 'Thug':
      return firstNight ? 'First night: wake up and learn your Mafia teammates.' : 'Vote on the shared Mafia victim.';
    case 'Thief':
      return firstNight ? 'Learn your Mafia teammates, then block one player.' : 'Choose the Mafia victim and block one player.';
    case 'Lawyer':
      return firstNight ? 'Learn your Mafia teammates, then investigate one player.' : 'Choose the Mafia victim and investigate one player.';
    case 'Godfather':
      return firstNight ? 'Learn your Mafia teammates, then silence one player for tomorrow.' : 'Choose the Mafia victim and silence one player.';
    case 'Snitch':
      return firstNight ? 'Learn your Mafia teammates, then badmouth one player.' : 'Choose the Mafia victim and badmouth one player.';
    case 'Yakuza':
      return firstNight ? 'First night has no kills.' : 'Choose the Yakuza victim.';
    case 'Detective':
    case 'Priest':
      return firstNight ? 'Choose whether to investigate or kill. The opening night never has any deaths.' : 'Choose whether to investigate or kill.';
    case 'Sheriff':
    case 'Psycho':
      return firstNight ? 'Choose a victim, but no one dies on the opening night.' : 'Choose a victim.';
    case 'FemmeFatale':
      return firstNight ? 'Choose a victim, but Bystanders survive and the opening night never has any deaths.' : 'Choose a victim. Bystanders survive your attack.';
    case 'Journalist':
      return 'Choose two players to compare their teams.';
    case 'Jailer':
      return 'Investigate a player. If they are Mafia or Yakuza, they go to jail.';
    case 'Judge':
      return 'Investigate one player. Your daytime vote will count twice.';
    case 'Nurse':
      return 'Protect one player from dying tonight.';
    case 'Bodyguard':
      return 'Protect one player. If they would die tonight, you die instead.';
    case 'Vixen':
      return 'Seduce one player. They cannot use their ability, and they cannot be killed.';
    case 'Hypnotist':
      return 'Hypnotize one player so their vote follows yours tomorrow.';
    case 'Impostor':
      return firstNight ? 'Pretend to be Mafia and wake with them. You still submit a Mafia vote on later nights.' : 'Pretend to be Mafia and join the shared Mafia vote.';
    default:
      return '';
  }
}

function defaultActionForRole(role: Player['role']): AbilityAction {
  switch (role) {
    case 'Nurse':
    case 'Bodyguard':
      return 'protect';
    case 'Vixen':
    case 'Thief':
      return 'block';
    case 'Hypnotist':
      return 'hypnotize';
    case 'Journalist':
      return 'compare';
    case 'Detective':
    case 'Priest':
    case 'Jailer':
    case 'Judge':
    case 'Lawyer':
      return 'investigate';
    case 'Sheriff':
    case 'FemmeFatale':
    case 'Psycho':
      return 'kill';
    case 'Godfather':
      return 'silence';
    case 'Snitch':
      return 'badmouth';
    default:
      return null;
  }
}

function allowedActions(role: Player['role']) {
  switch (role) {
    case 'Detective':
    case 'Priest':
      return ['investigate', 'kill'];
    default:
      return defaultActionForRole(role) ? [defaultActionForRole(role)] : [];
  }
}

export default function NightPhaseView() {
  const { lobby, me, socket } = useGame();
  const [mafiaTarget, setMafiaTarget] = useState<string | null>(null);
  const [yakuzaTarget, setYakuzaTarget] = useState<string | null>(null);
  const [abilityTarget, setAbilityTarget] = useState<string | null>(null);
  const [secondaryTarget, setSecondaryTarget] = useState<string | null>(null);
  const [abilityAction, setAbilityAction] = useState<AbilityAction>(defaultActionForRole(me?.role ?? null));

  if (!lobby || !me || !socket || !me.role) return null;

  const firstNight = lobby.gameState.firstNight;
  const isMafia = me.team === 'Mafia' || me.role === 'Impostor';
  const isYakuza = me.team === 'Yakuza';
  const needsMafiaVote = isMafia && !firstNight;
  const needsYakuzaVote = isYakuza && !firstNight;
  const actions = allowedActions(me.role);
  const hasAbility = actions.length > 0;
  const compareMode = abilityAction === 'compare';
  const isActive = me.isAlive && !me.isJailed && (needsMafiaVote || needsYakuzaVote || hasAbility || isMafia || isYakuza);

  const selectablePlayers = useMemo(
    () => lobby.players.filter((player) => player.isAlive && player.playerId !== me.playerId),
    [lobby.players, me.playerId],
  );

  const teammates = lobby.players.filter((player) => player.isAlive && player.playerId !== me.playerId && (
    (isMafia && player.team === 'Mafia') || (me.role === 'Impostor' && player.team === 'Mafia') || (isYakuza && player.team === 'Yakuza')
  ));

  const submitted = (!needsMafiaVote || me.mafiaVoteTarget !== null)
    && (!needsYakuzaVote || me.yakuzaVoteTarget !== null)
    && (!hasAbility || (compareMode ? (me.abilityTarget !== null && me.secondaryAbilityTarget !== null) : (me.abilityTarget !== null && me.abilityAction !== null)));

  const handleSubmit = () => {
    if ((needsMafiaVote && !mafiaTarget) || (needsYakuzaVote && !yakuzaTarget)) return;
    if (hasAbility) {
      if (compareMode && (!abilityTarget || !secondaryTarget || abilityTarget === secondaryTarget)) return;
      if (!compareMode && !abilityTarget) return;
    }

    socket.emit('submitNightAction', {
      lobbyId: lobby.lobbyId,
      mafiaTargetId: needsMafiaVote ? mafiaTarget : null,
      yakuzaTargetId: needsYakuzaVote ? yakuzaTarget : null,
      abilityTargetId: hasAbility ? abilityTarget : null,
      secondaryAbilityTargetId: compareMode ? secondaryTarget : null,
      abilityAction: hasAbility ? abilityAction : null,
    });
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center fade-in bg-black">
        <h2 className="text-4xl font-black mb-4 text-gray-500">Night Phase</h2>
        <p className="text-xl text-gray-400 mb-12">{me.isJailed ? 'You are jailed tonight and cannot act.' : 'Keep your eyes shut and wait for dawn.'}</p>
        <div className="w-16 h-16 border-4 border-gray-700 border-t-citizenBlue rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col p-6 max-w-md mx-auto min-h-screen fade-in bg-black pb-36">
      <div className="text-center mb-6 pt-8">
        <h2 className="text-4xl font-black text-white mb-2 tracking-wide">Night Phase</h2>
        <p className="text-gray-400">{roleInstructions(me.role, firstNight)}</p>
      </div>

      {teammates.length > 0 && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-2xl p-4 mb-6">
          <h3 className="text-sm font-bold uppercase tracking-widest text-red-300 mb-2">{isYakuza ? 'Yakuza Team' : 'Criminal Team'}</h3>
          <div className="flex flex-wrap gap-2 justify-center">
            {teammates.map((player) => (
              <span key={player.playerId} className="px-3 py-1 rounded-full bg-mafiaRed/20 text-red-200 text-sm">
                {player.displayName}
              </span>
            ))}
          </div>
        </div>
      )}

      {submitted ? (
        <div className="flex-1 flex flex-col items-center justify-center mt-20">
          <div className="w-16 h-16 border-4 border-gray-700 border-t-citizenBlue rounded-full animate-spin mb-6" />
          <h3 className="text-2xl font-bold mb-4 text-white">Choices locked.</h3>
          <p className="text-gray-500 animate-pulse text-center max-w-xs">Waiting for the rest of the night sequence to finish...</p>
        </div>
      ) : (
        <div className="flex-1 flex flex-col gap-6">
          {needsMafiaVote && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-red-300 mb-3">Choose the Mafia victim</h3>
              <div className="grid grid-cols-2 gap-3">
                {selectablePlayers.map((player) => (
                  <button key={player.playerId} onClick={() => setMafiaTarget(player.playerId)} className={`p-4 rounded-2xl transition-all ${mafiaTarget === player.playerId ? 'bg-mafiaRed text-white font-bold scale-105' : 'bg-darkPanel text-gray-300 hover:bg-gray-700'}`}>
                    {player.displayName}
                  </button>
                ))}
              </div>
            </section>
          )}

          {needsYakuzaVote && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-yellow-300 mb-3">Choose the Yakuza victim</h3>
              <div className="grid grid-cols-2 gap-3">
                {selectablePlayers.map((player) => (
                  <button key={player.playerId} onClick={() => setYakuzaTarget(player.playerId)} className={`p-4 rounded-2xl transition-all ${yakuzaTarget === player.playerId ? 'bg-yellow-200 text-black font-bold scale-105' : 'bg-darkPanel text-gray-300 hover:bg-gray-700'}`}>
                    {player.displayName}
                  </button>
                ))}
              </div>
            </section>
          )}

          {hasAbility && (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-widest text-citizenBlue mb-3">Use your role ability</h3>

              {actions.length > 1 && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {actions.map((action) => (
                    <button key={action} onClick={() => setAbilityAction(action as AbilityAction)} className={`py-3 rounded-xl font-semibold transition-all ${abilityAction === action ? 'bg-white text-black' : 'bg-darkPanel text-gray-300 hover:bg-gray-700'}`}>
                      {action === 'investigate' ? 'Investigate' : 'Kill'}
                    </button>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectablePlayers.map((player) => (
                  <button key={player.playerId} onClick={() => compareMode && abilityTarget === player.playerId ? setSecondaryTarget(player.playerId) : setAbilityTarget(player.playerId)} className={`p-4 rounded-2xl transition-all ${
                    abilityTarget === player.playerId || secondaryTarget === player.playerId ? 'bg-citizenBlue text-white font-bold scale-105' : 'bg-darkPanel text-gray-300 hover:bg-gray-700'
                  }`}>
                    {player.displayName}
                    {abilityTarget === player.playerId && compareMode && <span className="block text-xs mt-1 opacity-80">First pick</span>}
                    {secondaryTarget === player.playerId && compareMode && <span className="block text-xs mt-1 opacity-80">Second pick</span>}
                  </button>
                ))}
              </div>
              {compareMode && (
                <p className="text-xs text-gray-500 mt-3">Tap one player for the first comparison target, then another for the second.</p>
              )}
            </section>
          )}
        </div>
      )}

      {!submitted && (
        <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black via-black to-transparent flex justify-center pb-safe">
          <button
            onClick={handleSubmit}
            disabled={(needsMafiaVote && !mafiaTarget) || (needsYakuzaVote && !yakuzaTarget) || (hasAbility && (compareMode ? (!abilityTarget || !secondaryTarget || abilityTarget === secondaryTarget) : !abilityTarget))}
            className={`w-full max-w-md py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all ${
              (needsMafiaVote && !mafiaTarget) || (needsYakuzaVote && !yakuzaTarget) || (hasAbility && (compareMode ? (!abilityTarget || !secondaryTarget || abilityTarget === secondaryTarget) : !abilityTarget))
                ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                : 'bg-white text-black hover:bg-gray-200'
            }`}
          >
            Lock In Night Choice
          </button>
        </div>
      )}
    </div>
  );
}

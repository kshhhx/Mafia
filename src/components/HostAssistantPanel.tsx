'use client';

import { useMemo } from 'react';
import { useGame } from '@/lib/socketClient';
import type { Lobby, Player, Role } from '@/lib/types';

function isParticipant(lobby: Lobby, player: Player) {
  return player.playerId !== lobby.hostId;
}

function getAllowedActions(role: Role) {
  switch (role) {
    case 'Nurse':
    case 'Bodyguard':
      return ['protect'];
    case 'Vixen':
    case 'Thief':
      return ['block'];
    case 'Hypnotist':
      return ['hypnotize'];
    case 'Journalist':
      return ['compare'];
    case 'Detective':
    case 'Priest':
      return ['investigate', 'kill'];
    case 'Jailer':
    case 'Judge':
    case 'Lawyer':
      return ['investigate'];
    case 'Sheriff':
    case 'Psycho':
    case 'FemmeFatale':
      return ['kill'];
    case 'Godfather':
      return ['silence'];
    case 'Snitch':
      return ['badmouth'];
    default:
      return [];
  }
}

function needsMafiaVote(player: Player) {
  return player.isAlive && (player.team === 'Mafia' || player.role === 'Impostor');
}

function needsYakuzaVote(player: Player) {
  return player.isAlive && player.team === 'Yakuza';
}

function hasPendingNightAction(player: Player) {
  if (!player.isAlive || !player.role || player.isJailed) return false;

  const needsAbility = getAllowedActions(player.role).length > 0;
  const needsCompare = player.abilityAction === 'compare';
  const mafiaPending = needsMafiaVote(player) && player.mafiaVoteTarget === null;
  const yakuzaPending = needsYakuzaVote(player) && player.yakuzaVoteTarget === null;
  const abilityPending = needsAbility && (
    player.abilityAction === null
    || player.abilityTarget === null
    || (needsCompare && player.secondaryAbilityTarget === null)
  );

  return mafiaPending || yakuzaPending || abilityPending;
}

function getModeratorDetails(lobby: Lobby) {
  const participants = lobby.players.filter((player) => isParticipant(lobby, player));
  const activePlayers = participants.filter((player) => player.isAlive);
  const unresolvedReveal = activePlayers.filter((player) => !player.readyToContinue).length;
  const unresolvedNight = activePlayers.filter((player) => hasPendingNightAction(player)).length;
  const unresolvedVotes = activePlayers.filter((player) => !player.isJailed && !player.isSilenced && player.currentVote === null).length;

  switch (lobby.gameState.phase) {
    case 'role_reveal':
      return {
        phaseLabel: 'Private Role Reveal',
        announcement: 'Ask every player to look at their screen privately and confirm once they understand their role.',
        steps: [
          'Give players a moment to read their role and teammates.',
          'Wait until every player has tapped Ready.',
          'The app will begin the first night automatically.',
        ],
        status: unresolvedReveal > 0 ? `${unresolvedReveal} player(s) still need to confirm their role.` : 'All players are ready. Night will begin automatically.',
        primaryAction: null,
      };
    case 'night':
      return {
        phaseLabel: `Night ${lobby.gameState.roundNumber}`,
        announcement: 'Tell the room to stay quiet. Players with actions should follow the prompts on their own screen in order.',
        steps: [
          'Mafia choose a victim on their screens.',
          'Players with role abilities complete them privately.',
          'The app moves to day as soon as all required night actions are submitted.',
        ],
        status: unresolvedNight > 0 ? `${unresolvedNight} player(s) still have night actions pending.` : 'All night actions are complete. Dawn is resolving automatically.',
        primaryAction: null,
      };
    case 'day':
      return {
        phaseLabel: `Day ${lobby.gameState.roundNumber}`,
        announcement: 'Read the overnight results to the room, open discussion, and decide when the table is ready to vote.',
        steps: [
          'Announce any overnight deaths and dawn effects.',
          'Run open discussion and let players debate suspects.',
          'When discussion is done, open voting from here.',
        ],
        status: 'Discussion is moderator-led during the day phase.',
        primaryAction: { label: 'Open Voting' },
      };
    case 'voting':
      return {
        phaseLabel: 'Voting',
        announcement: 'Tell each eligible player to cast one vote in the app.',
        steps: [
          'Wait for every eligible player to vote.',
          'The app will total the votes automatically.',
          'The result screen appears as soon as all votes are in.',
        ],
        status: unresolvedVotes > 0 ? `${unresolvedVotes} vote(s) are still missing.` : 'All votes are in. The result is resolving automatically.',
        primaryAction: null,
      };
    case 'result':
      return {
        phaseLabel: 'Verdict',
        announcement: 'Read the elimination result, then begin the next night when the room is ready.',
        steps: [
          'Announce who was eliminated, or that no one was eliminated.',
          'Give players a brief moment to absorb the result.',
          'Start the next night from here.',
        ],
        status: 'Use this pause to reset the room before night begins again.',
        primaryAction: { label: 'Start Next Night' },
      };
    case 'ended':
      return {
        phaseLabel: 'Game Over',
        announcement: 'Announce the winning team and review the final roles with the group.',
        steps: [
          'Reveal the winning faction.',
          'Review the final role list with the table.',
          'Restart or return home when the group is ready.',
        ],
        status: `${participants.length} player(s) were part of this match.`,
        primaryAction: null,
      };
    default:
      return {
        phaseLabel: 'Lobby',
        announcement: 'Finish setup and start once the room is full.',
        steps: [],
        status: '',
        primaryAction: null,
      };
  }
}

export default function HostAssistantPanel() {
  const { lobby, me, socket } = useGame();
  const details = useMemo(() => (lobby ? getModeratorDetails(lobby) : null), [lobby]);

  if (!lobby || !me || !socket || lobby.hostId !== me.playerId || !details || lobby.gameState.phase === 'lobby') return null;

  return (
    <div className="flex min-h-screen items-center justify-center p-6 fade-in">
      <div className="w-full max-w-2xl rounded-[2rem] border border-gray-700 bg-darkPanel/95 p-6 shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">Moderator Console</p>
        <h2 className="mt-2 text-3xl font-black text-white">{details.phaseLabel}</h2>
        <p className="mt-3 text-base leading-7 text-gray-200">{details.announcement}</p>

        <div className="mt-5 rounded-2xl bg-black/25 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Moderator Steps</h3>
          <div className="mt-3 space-y-3">
            {details.steps.map((step, index) => (
              <div key={step} className="rounded-2xl bg-white/5 px-4 py-3 text-sm text-gray-200">
                <span className="mr-2 font-black text-mafiaRed">{index + 1}.</span>
                {step}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-gray-800 bg-black/20 p-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Live Status</h3>
          <p className="mt-2 text-sm leading-6 text-gray-200">{details.status}</p>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {details.primaryAction && (
            <button
              type="button"
              onClick={() => socket.emit('continueToNextPhase', lobby.lobbyId)}
              className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-black hover:bg-gray-200"
            >
              {details.primaryAction.label}
            </button>
          )}
          <button
            type="button"
            onClick={() => socket.emit('forceAdvancePhase', lobby.lobbyId)}
            className="rounded-xl border border-gray-600 bg-gray-800 px-5 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-700"
          >
            Force Advance
          </button>
        </div>
      </div>
    </div>
  );
}

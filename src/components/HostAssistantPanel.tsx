'use client';

import { useEffect, useMemo, useRef } from 'react';
import { useGame } from '@/lib/socketClient';
import type { Lobby, Player, Role } from '@/lib/types';

function isParticipant(lobby: Lobby, player: Player) {
  return !(lobby.settings.hostRoleMode === 'moderator' && player.playerId === lobby.hostId);
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

function needsMafiaVote(player: Player, lobby: Lobby) {
  if (!player.isAlive || lobby.gameState.firstNight) return false;
  return player.team === 'Mafia' || player.role === 'Impostor';
}

function needsYakuzaVote(player: Player, lobby: Lobby) {
  if (!player.isAlive || lobby.gameState.firstNight) return false;
  return player.team === 'Yakuza';
}

function hasPendingNightAction(player: Player, lobby: Lobby) {
  if (!player.isAlive || !player.role || player.isJailed) return false;

  const needsAbility = getAllowedActions(player.role).length > 0;
  const needsCompare = player.abilityAction === 'compare';
  const mafiaPending = needsMafiaVote(player, lobby) && player.mafiaVoteTarget === null;
  const yakuzaPending = needsYakuzaVote(player, lobby) && player.yakuzaVoteTarget === null;
  const abilityPending = needsAbility && (
    player.abilityAction === null
    || player.abilityTarget === null
    || (needsCompare && player.secondaryAbilityTarget === null)
  );

  return mafiaPending || yakuzaPending || abilityPending;
}

function getAnnouncement(lobby: Lobby) {
  const participants = lobby.players.filter((player) => isParticipant(lobby, player));
  const activePlayers = participants.filter((player) => player.isAlive);
  const unresolvedNightPlayers = activePlayers.filter((player) => hasPendingNightAction(player, lobby)).length;
  const unresolvedVotes = activePlayers.filter((player) => !player.isJailed && !player.isSilenced && player.currentVote === null).length;
  const unresolvedContinue = activePlayers.filter((player) => !player.readyToContinue).length;

  const base = {
    title: '',
    body: '',
    footer: '',
  };

  switch (lobby.gameState.phase) {
    case 'role_reveal':
      return {
        ...base,
        title: 'Private Role Reveal',
        body: 'Tell everyone to check their role privately and tap continue once they understand it.',
        footer: unresolvedContinue > 0 ? `${unresolvedContinue} player(s) still reviewing their role.` : 'Everyone is ready for night.',
      };
    case 'night':
      return {
        ...base,
        title: `Night ${lobby.gameState.roundNumber}`,
        body: lobby.gameState.firstNight
          ? 'Night falls. Players should complete any role prompts on their screens. Opening night ends with no deaths.'
          : 'Night falls. Only players with actions on screen should act now. Everyone else stays quiet and waits.',
        footer: unresolvedNightPlayers > 0 ? `${unresolvedNightPlayers} player(s) still have night actions pending.` : 'All night actions are in.',
      };
    case 'day':
      return {
        ...base,
        title: `Day ${lobby.gameState.roundNumber}`,
        body: 'Morning has arrived. Read the overnight results, then open discussion and let the table debate suspects.',
        footer: unresolvedContinue > 0 ? `${unresolvedContinue} player(s) have not finished discussion yet.` : 'Everyone is ready to move into voting.',
      };
    case 'voting':
      return {
        ...base,
        title: 'Voting',
        body: 'Discussion is over. Ask every eligible player to cast one vote in the app or abstain if your table allows it.',
        footer: unresolvedVotes > 0 ? `${unresolvedVotes} vote(s) are still missing.` : 'All votes are locked in.',
      };
    case 'result':
      return {
        ...base,
        title: 'Verdict',
        body: 'Read the vote result to the table, then let everyone prepare for the next night.',
        footer: unresolvedContinue > 0 ? `${unresolvedContinue} player(s) are still reading the result.` : 'The table is ready for the next night.',
      };
    case 'ended':
      return {
        ...base,
        title: 'Game Over',
        body: 'Announce the winning team and review the final roles with the group.',
        footer: `${participants.length} player(s) were in the game.`,
      };
    default:
      return {
        ...base,
        title: 'Lobby',
        body: 'Set up the room, choose your host mode, and start once the table is ready.',
        footer: `${participants.length} configured player slot(s).`,
      };
  }
}

function announcementKey(lobby: Lobby) {
  return [
    lobby.gameState.phase,
    lobby.gameState.roundNumber,
    lobby.gameState.firstNight ? 'first' : 'standard',
    lobby.gameState.lastEliminated ?? 'none',
    lobby.gameState.nightDeaths.join(','),
    lobby.gameState.dawnAnnouncements.join('|'),
  ].join('::');
}

function speak(text: string) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.97;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
}

export default function HostAssistantPanel({ expanded = false }: { expanded?: boolean }) {
  const { lobby, me, socket } = useGame();
  const lastAnnouncementKey = useRef<string | null>(null);

  const isHost = Boolean(lobby && me && lobby.hostId === me.playerId);
  const details = useMemo(() => (lobby ? getAnnouncement(lobby) : null), [lobby]);
  const speechText = details ? `${details.title}. ${details.body}. ${details.footer}` : '';
  const key = lobby ? announcementKey(lobby) : null;

  useEffect(() => {
    if (!lobby || !me || !isHost || lobby.settings.announcementMode !== 'ai' || !details || !key) return;
    if (lastAnnouncementKey.current === key) return;
    lastAnnouncementKey.current = key;
    speak(speechText);
  }, [details, isHost, key, lobby, me, speechText]);

  if (!lobby || !me || !socket || !isHost || !details || lobby.gameState.phase === 'lobby') return null;

  const content = (
    <div className={`${expanded ? 'rounded-[2rem] border border-gray-700 bg-darkPanel/95 p-6 shadow-2xl' : 'rounded-3xl border border-gray-700 bg-black/85 p-4 shadow-2xl backdrop-blur-xl'}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gray-500">
            {lobby.settings.hostRoleMode === 'moderator' ? 'Moderator Console' : 'Host Assistant'}
          </p>
          <h2 className="mt-2 text-2xl font-black text-white">{details.title}</h2>
          <p className="mt-2 text-sm leading-6 text-gray-200">{details.body}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${lobby.settings.announcementMode === 'ai' ? 'bg-mafiaRed/20 text-red-200' : 'bg-gray-800 text-gray-300'}`}>
          {lobby.settings.announcementMode === 'ai' ? 'AI Voice On' : 'Manual Prompt'}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-black/25 p-4 text-sm text-gray-300">
        <p>{details.footer}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => speak(speechText)}
          className="rounded-xl bg-white px-4 py-3 text-sm font-bold text-black hover:bg-gray-200"
        >
          {lobby.settings.announcementMode === 'ai' ? 'Replay Announcement' : 'Play Voice Prompt'}
        </button>
        {lobby.hostId === me.playerId && (
          <button
            type="button"
            onClick={() => socket.emit('forceAdvancePhase', lobby.lobbyId)}
            className="rounded-xl border border-gray-600 bg-gray-800 px-4 py-3 text-sm font-semibold text-gray-200 hover:bg-gray-700"
          >
            Force Advance
          </button>
        )}
      </div>
    </div>
  );

  if (expanded) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 fade-in">
        <div className="w-full max-w-2xl">{content}</div>
      </div>
    );
  }

  return <div className="fixed bottom-6 left-4 right-4 z-30 mx-auto max-w-sm">{content}</div>;
}

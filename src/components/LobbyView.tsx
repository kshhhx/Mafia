'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGame } from '@/lib/socketClient';
import { GAME_MODE_DETAILS, MYSTERY_MODE_HELP, ROLE_BRIEFS, ROLE_CONFIG_TO_ROLE, ROLE_DISPLAY_NAMES } from '@/lib/rules';
import type { GameMode, RoleConfig } from '@/lib/types';

const CLASSIC_SETUPS: Record<number, Partial<RoleConfig>> = {
  6: { bystander: 4, detective: 1, thug: 1 },
  7: { bystander: 4, detective: 1, thug: 2 },
  8: { bystander: 4, nurse: 1, detective: 1, thug: 2 },
  9: { bystander: 5, nurse: 1, detective: 1, thug: 2 },
  10: { bystander: 4, nurse: 1, bodyguard: 1, detective: 1, thug: 2, thief: 1 },
  11: { bystander: 6, nurse: 1, detective: 1, thug: 2, thief: 1 },
  12: { bystander: 6, nurse: 1, bodyguard: 1, detective: 1, thug: 2, thief: 1 },
  13: { bystander: 6, nurse: 1, bodyguard: 1, detective: 1, thug: 3, thief: 1 },
  14: { bystander: 7, nurse: 1, bodyguard: 1, vixen: 1, detective: 1, thug: 3, thief: 1 },
  15: { bystander: 8, nurse: 1, bodyguard: 1, vixen: 1, detective: 1, thug: 3, thief: 1 },
  16: { bystander: 8, nurse: 1, bodyguard: 1, vixen: 1, detective: 1, thug: 2, thief: 1, lawyer: 1 },
};

const ROLE_GROUPS: Array<{ title: string; fields: Array<{ key: keyof RoleConfig; label: string }> }> = [
  {
    title: 'Core Roles',
    fields: [
      { key: 'bystander', label: 'Civilian' },
      { key: 'detective', label: 'Detective' },
      { key: 'thug', label: 'Mafia' },
    ],
  },
  {
    title: 'Unlocked Specialists',
    fields: [
      { key: 'nurse', label: 'Nurse' },
      { key: 'bodyguard', label: 'Bodyguard' },
      { key: 'vixen', label: 'Vixen' },
      { key: 'hypnotist', label: 'Hypnotist' },
      { key: 'journalist', label: 'Journalist' },
      { key: 'jailer', label: 'Jailer' },
      { key: 'priest', label: 'Priest' },
      { key: 'judge', label: 'Judge' },
      { key: 'sheriff', label: 'Sheriff' },
      { key: 'thief', label: 'Thief' },
      { key: 'lawyer', label: 'Lawyer' },
      { key: 'godfather', label: 'Godfather' },
      { key: 'snitch', label: 'Snitch' },
    ],
  },
  {
    title: 'Alternate Modes',
    fields: [
      { key: 'yakuza', label: 'Yakuza' },
      { key: 'femmeFatale', label: 'Femme Fatale' },
      { key: 'impostor', label: 'Impostor' },
      { key: 'psycho', label: 'Psycho' },
    ],
  },
];

function emptyConfig(): RoleConfig {
  return {
    bystander: 0,
    nurse: 0,
    bodyguard: 0,
    vixen: 0,
    hypnotist: 0,
    journalist: 0,
    detective: 0,
    jailer: 0,
    priest: 0,
    judge: 0,
    sheriff: 0,
    thug: 0,
    thief: 0,
    lawyer: 0,
    godfather: 0,
    snitch: 0,
    yakuza: 0,
    femmeFatale: 0,
    impostor: 0,
    psycho: 0,
  };
}

export default function LobbyView() {
  const { lobby, me, socket } = useGame();
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [joinUrl, setJoinUrl] = useState('');

  useEffect(() => {
    if (lobby && typeof window !== 'undefined') {
      setJoinUrl(`${window.location.origin}/?lobby=${lobby.lobbyId}`);
    }
  }, [lobby]);

  if (!lobby || !me || !socket) return null;

  const isHost = lobby.hostId === me.playerId;
  const joinedCount = Math.max(0, lobby.players.length - 1);
  const intendedCount = lobby.settings.intendedPlayerCount;
  const effectiveCount = Math.max(joinedCount, intendedCount);
  const totalRoles = Object.values(lobby.roleConfig).reduce((sum, count) => sum + count, 0);
  const waitingFor = Math.max(0, intendedCount - joinedCount);
  const roleDelta = intendedCount - totalRoles;
  const canStart = waitingFor === 0 && roleDelta === 0;

  const visibleRoleGroups = useMemo(
    () =>
      ROLE_GROUPS.map((group) => ({
        ...group,
        fields: group.fields.filter(({ key }) => ROLE_BRIEFS[ROLE_CONFIG_TO_ROLE[key]].minPlayers <= effectiveCount),
      })).filter((group) => group.fields.length > 0),
    [effectiveCount],
  );

  const applyClassic = () => {
    socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { mode: 'classic' } });
    socket.emit('updateRoleConfig', {
      lobbyId: lobby.lobbyId,
      config: { ...emptyConfig(), ...(CLASSIC_SETUPS[effectiveCount] || { bystander: Math.max(0, effectiveCount - 2), detective: 1, thug: 1 }) },
    });
  };

  const updateRole = (key: keyof RoleConfig, delta: number) => {
    if (delta > 0 && totalRoles >= intendedCount) return;
    const next = Math.max(0, lobby.roleConfig[key] + delta);
    socket.emit('updateRoleConfig', { lobbyId: lobby.lobbyId, config: { ...lobby.roleConfig, [key]: next } });
  };

  const setMode = (mode: GameMode) => {
    socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { mode } });
    setShowModeMenu(false);
  };

  const modeDetails = GAME_MODE_DETAILS[lobby.settings.mode];
  const qrSrc = joinUrl
    ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(joinUrl)}`
    : '';

  return (
    <div className="flex flex-col p-6 max-w-md mx-auto fade-in">
      <div className="text-center mb-6">
        <h2 className="text-gray-500 font-semibold tracking-[0.25em] uppercase text-xs mb-2">Room Code</h2>
        <h1 className="text-5xl font-black tracking-[0.15em] text-mafiaRed">{lobby.lobbyId}</h1>
        <p className="text-gray-400 mt-3 text-sm max-w-sm mx-auto">
          The host moderates the game, players join the table, and the app handles private actions in order.
        </p>
      </div>

      <div className="bg-darkPanel rounded-3xl p-4 mb-5 shadow-lg border border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Players In Game</h3>
            <p className="text-2xl font-black text-white mt-1">
              {joinedCount}/{intendedCount}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {waitingFor > 0 ? `Waiting for ${waitingFor} more player${waitingFor === 1 ? '' : 's'}.` : 'Moderator is separate. The player table is ready.'}
            </p>
          </div>

          {isHost && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { intendedPlayerCount: intendedCount - 1 } })}
                className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700"
              >
                -
              </button>
              <span className="w-8 text-center font-bold">{intendedCount}</span>
              <button
                onClick={() => socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { intendedPlayerCount: intendedCount + 1 } })}
                className="w-9 h-9 rounded-full bg-gray-800 hover:bg-gray-700"
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-darkPanel rounded-3xl p-4 mb-5 shadow-lg border border-gray-800">
        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3">Players</h3>
        <ul className="space-y-3">
          {lobby.players.map((player) => (
            <li key={player.playerId} className="flex items-center justify-between rounded-2xl bg-black/20 px-4 py-3">
              <span className="font-medium text-lg flex items-center">
                {player.displayName}
                {player.playerId === lobby.hostId && <span className="text-yellow-500 text-sm ml-2">Moderator</span>}
              </span>
              {isHost && player.playerId !== lobby.hostId && (
                <button
                  onClick={() => socket.emit('kickPlayer', { lobbyId: lobby.lobbyId, targetId: player.playerId })}
                  className="text-xs text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                >
                  Kick
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="bg-darkPanel rounded-3xl p-4 mb-5 shadow-lg border border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">Role Setup</h3>
              <p className="text-xs text-gray-400 mt-1">Advanced roles unlock as the intended table size increases.</p>
            </div>
            <button onClick={applyClassic} className="text-xs bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600 transition-colors">
              Suggested Cast
            </button>
          </div>

          <div className="mb-4 rounded-2xl border border-gray-800 bg-black/20 p-3">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Moderator Mode</p>
            <p className="mt-2 text-sm leading-6 text-gray-300">
              The host stays out of the role cast and gets a dedicated moderator console with the phase order, announcements, and action reminders.
            </p>
          </div>

          <div className="mb-4 rounded-2xl border border-gray-800 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Game Mode</p>
                <p className="mt-1 text-base font-semibold text-white">{modeDetails.label}</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">{modeDetails.description}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowModeMenu((current) => !current)}
                className="rounded-full bg-gray-800 px-3 py-2 text-xs font-semibold text-gray-200 hover:bg-gray-700"
              >
                Game Mode
              </button>
            </div>

            {showModeMenu && (
              <div className="mt-3 space-y-2">
                {(['classic', 'loner', 'yakuza'] as GameMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setMode(mode)}
                    className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                      lobby.settings.mode === mode
                        ? 'border-white/50 bg-white text-black'
                        : 'border-gray-800 bg-gray-900/70 text-gray-200 hover:bg-gray-800'
                    }`}
                  >
                    <div className="font-semibold">{GAME_MODE_DETAILS[mode].label}</div>
                    <div className={`mt-1 text-xs leading-5 ${lobby.settings.mode === mode ? 'text-black/75' : 'text-gray-400'}`}>
                      {GAME_MODE_DETAILS[mode].description}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mb-5 rounded-2xl border border-gray-800 bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">Mystery Mode</p>
                <p className="mt-1 text-xs leading-5 text-gray-400">{MYSTERY_MODE_HELP}</p>
              </div>
              <button
                type="button"
                className="mt-0.5 h-6 w-6 rounded-full bg-gray-700 text-xs text-white hover:bg-gray-600"
                aria-label="What is Mystery Mode?"
                title={MYSTERY_MODE_HELP}
              >
                i
              </button>
            </div>
            <button
              onClick={() => socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { mysteryMode: !lobby.settings.mysteryMode } })}
              className={`mt-3 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                lobby.settings.mysteryMode ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              Mystery Mode: {lobby.settings.mysteryMode ? 'On' : 'Off'}
            </button>
          </div>

          <div className={`mb-5 rounded-2xl border p-3 ${roleDelta === 0 ? 'border-emerald-700/50 bg-emerald-950/20' : 'border-amber-700/50 bg-amber-950/20'}`}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Role Balance</p>
                <p className="mt-1 text-sm text-white">{totalRoles}/{intendedCount} roles configured</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${roleDelta === 0 ? 'bg-emerald-500/20 text-emerald-200' : 'bg-amber-500/20 text-amber-200'}`}>
                {roleDelta === 0 ? 'Balanced' : roleDelta > 0 ? `${roleDelta} too many` : `${Math.abs(roleDelta)} missing`}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-gray-300">
              {roleDelta === 0
                ? 'The cast matches the intended player count.'
                : roleDelta > 0
                  ? 'Remove roles until the cast matches the intended player count.'
                  : 'Add more roles to match the intended player count before starting.'}
            </p>
          </div>

          <div className="space-y-6 max-h-[28rem] overflow-y-auto pr-1">
            {visibleRoleGroups.map((group) => (
              <section key={group.title}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{group.title}</h4>
                <div className="space-y-3">
                  {group.fields.map(({ key, label }) => {
                    const role = ROLE_CONFIG_TO_ROLE[key];
                    const maxedOut = totalRoles >= intendedCount;
                    return (
                      <div key={key} className="flex items-center justify-between rounded-2xl bg-black/20 px-3 py-3">
                        <span className="font-medium">{ROLE_DISPLAY_NAMES[role] || label}</span>
                        <div className="flex items-center space-x-4">
                          <button onClick={() => updateRole(key, -1)} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600">
                            -
                          </button>
                          <span className="w-4 text-center font-bold">{lobby.roleConfig[key]}</span>
                          <button
                            onClick={() => updateRole(key, 1)}
                            disabled={maxedOut}
                            className={`w-8 h-8 rounded-full flex items-center justify-center ${maxedOut ? 'bg-gray-800 text-gray-600 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-600'}`}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </div>
      )}

      {joinUrl && (
        <div className="bg-darkPanel rounded-3xl p-4 mb-5 shadow-lg border border-gray-800 text-center">
          <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400">Quick Join</h3>
          <p className="mt-2 text-xs leading-5 text-gray-400">Scan to open the join page with this room code already filled in.</p>
          <div className="mt-4 inline-flex rounded-[2rem] bg-white p-3 shadow-lg">
            <img src={qrSrc} alt={`QR code to join room ${lobby.lobbyId}`} className="h-44 w-44 rounded-2xl" />
          </div>
          <p className="mt-3 break-all text-xs text-gray-500">{joinUrl}</p>
        </div>
      )}

      {!isHost && (
        <div className="bg-darkPanel rounded-3xl p-4 mb-5 shadow-lg border border-gray-800 text-sm text-gray-300 leading-6">
          The host will act as moderator for this game. Once the player table is full, they can start the session.
        </div>
      )}

      <div className="mt-auto pt-2">
        {isHost ? (
          <button
            onClick={() => socket.emit('startGame', lobby.lobbyId)}
            disabled={!canStart}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all ${
              canStart ? 'bg-mafiaRed text-white hover:bg-red-600 cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-not-allowed'
            }`}
          >
            {waitingFor > 0 ? `Waiting For ${waitingFor} More` : 'Start Moderated Game'}
          </button>
        ) : (
          <div className="w-full py-4 rounded-xl text-center bg-black/20 text-gray-500 font-medium">
            Waiting for moderator to start
          </div>
        )}
      </div>
    </div>
  );
}

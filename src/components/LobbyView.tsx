'use client';

import { useGame } from '@/lib/socketClient';
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
    title: 'Civilian Roles',
    fields: [
      { key: 'bystander', label: 'Bystander' },
      { key: 'nurse', label: 'Nurse' },
      { key: 'bodyguard', label: 'Bodyguard' },
      { key: 'vixen', label: 'Vixen' },
      { key: 'hypnotist', label: 'Hypnotist' },
      { key: 'journalist', label: 'Journalist' },
      { key: 'detective', label: 'Detective' },
      { key: 'jailer', label: 'Jailer' },
      { key: 'priest', label: 'Priest' },
      { key: 'judge', label: 'Judge' },
      { key: 'sheriff', label: 'Sheriff' },
    ],
  },
  {
    title: 'Mafia Roles',
    fields: [
      { key: 'thug', label: 'Thug' },
      { key: 'thief', label: 'Thief' },
      { key: 'lawyer', label: 'Lawyer' },
      { key: 'godfather', label: 'Godfather' },
      { key: 'snitch', label: 'Snitch' },
    ],
  },
  {
    title: 'Alternate Mode Roles',
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
  if (!lobby || !me || !socket) return null;

  const isHost = lobby.hostId === me.playerId;
  const playerCount = lobby.players.length;
  const isBalanced = Object.values(lobby.roleConfig).reduce((sum, count) => sum + count, 0) === playerCount;

  const applyClassic = () => {
    socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { mode: 'classic' } });
    socket.emit('updateRoleConfig', {
      lobbyId: lobby.lobbyId,
      config: { ...emptyConfig(), ...(CLASSIC_SETUPS[playerCount] || { bystander: Math.max(0, playerCount - 2), detective: 1, thug: 1 }) },
    });
  };

  const setMode = (mode: GameMode) => {
    socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { mode } });
  };

  const toggleMystery = () => {
    socket.emit('updateSettings', { lobbyId: lobby.lobbyId, settings: { mysteryMode: !lobby.settings.mysteryMode } });
  };

  const updateRole = (key: keyof RoleConfig, delta: number) => {
    const next = Math.max(0, lobby.roleConfig[key] + delta);
    socket.emit('updateRoleConfig', { lobbyId: lobby.lobbyId, config: { ...lobby.roleConfig, [key]: next } });
  };

  return (
    <div className="flex flex-col p-6 max-w-md mx-auto fade-in">
      <div className="text-center mb-8">
        <h2 className="text-gray-400 font-semibold tracking-widest uppercase text-xs">Room Code</h2>
        <h1 className="text-5xl font-black tracking-widest text-mafiaRed">{lobby.lobbyId}</h1>
      </div>

      <div className="bg-darkPanel rounded-2xl p-4 mb-6 shadow-lg">
        <h3 className="text-lg font-bold mb-4 border-b border-gray-700 pb-2">Players ({playerCount})</h3>
        <ul className="space-y-3">
          {lobby.players.map((player) => (
            <li key={player.playerId} className="flex items-center justify-between">
              <span className="font-medium text-lg flex items-center">
                {player.displayName} {player.playerId === lobby.hostId && <span className="text-yellow-500 text-sm ml-2">👑</span>}
              </span>
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${player.isReady ? 'text-green-400' : 'text-gray-500'}`}>{player.isReady ? 'Ready' : 'Waiting'}</span>
                {isHost && player.playerId !== lobby.hostId && (
                  <button
                    onClick={() => socket.emit('kickPlayer', { lobbyId: lobby.lobbyId, targetId: player.playerId })}
                    className="text-xs text-red-500 hover:text-red-400 bg-red-500/10 hover:bg-red-500/20 px-2 py-1 rounded transition-colors"
                  >
                    Kick
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>

      {isHost && (
        <div className="bg-darkPanel rounded-2xl p-4 mb-6 shadow-lg">
          <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
            <div>
              <h3 className="text-lg font-bold">Rulebook Setup</h3>
              <p className="text-xs text-gray-400 mt-1">Classic auto-fill plus manual advanced-role controls.</p>
            </div>
            <button onClick={applyClassic} className="text-xs bg-gray-700 px-3 py-1 rounded-full hover:bg-gray-600 transition-colors">
              Classic Auto-fill
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            {(['classic', 'loner', 'yakuza'] as GameMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setMode(mode)}
                className={`py-2 rounded-lg text-sm font-semibold transition-all ${
                  lobby.settings.mode === mode ? 'bg-white text-black' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            onClick={toggleMystery}
            className={`w-full mb-5 py-3 rounded-xl text-sm font-semibold transition-all ${
              lobby.settings.mysteryMode ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            Mystery Mode: {lobby.settings.mysteryMode ? 'On' : 'Off'}
          </button>

          <div className="space-y-6 max-h-[28rem] overflow-y-auto pr-1">
            {ROLE_GROUPS.map((group) => (
              <section key={group.title}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">{group.title}</h4>
                <div className="space-y-3">
                  {group.fields.map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="font-medium">{label}</span>
                      <div className="flex items-center space-x-4">
                        <button onClick={() => updateRole(key, -1)} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600">
                          -
                        </button>
                        <span className="w-4 text-center font-bold">{lobby.roleConfig[key]}</span>
                        <button onClick={() => updateRole(key, 1)} className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600">
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {!isBalanced && (
            <div className="mt-4 text-xs text-red-400 bg-red-400/10 p-2 rounded text-center">
              Roles assigned must equal players before the game can start.
            </div>
          )}
        </div>
      )}

      <div className="mt-auto pt-8 flex flex-col space-y-4">
        <button
          onClick={() => socket.emit('toggleReady', lobby.lobbyId)}
          className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all outline outline-1 outline-gray-600 ${
            me.isReady ? 'bg-green-600 text-white' : 'bg-darkPanel text-gray-300'
          }`}
        >
          {me.isReady ? 'Ready!' : 'Mark Ready'}
        </button>

        {isHost && (
          <button
            onClick={() => socket.emit('startGame', lobby.lobbyId)}
            disabled={!isBalanced}
            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg active:scale-95 transition-all ${
              isBalanced ? 'bg-mafiaRed text-white hover:bg-red-600 cursor-pointer' : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            Start Game
          </button>
        )}
      </div>
    </div>
  );
}

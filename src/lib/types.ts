export type Role = 'Citizen' | 'Mafia' | 'Doctor' | 'Detective';
export type Team = 'Citizens' | 'Mafia';
export type GamePhase = 'lobby' | 'role_reveal' | 'night' | 'day' | 'voting' | 'result' | 'ended';

export interface Player {
  playerId: string;
  socketId: string;
  displayName: string;
  isAlive: boolean;
  role: Role | null;
  team: Team | null;
  isReady: boolean;
  currentVote: string | null;     // ID of player they are voting to eliminate
  nightAction: string | null;     // ID of target
  readyToContinue: boolean;
}

export interface LobbySettings {
  revealRoleOnDeath: boolean;
  discussionTimer: number; // 0 = off, else minutes
  nightActionTimer: number; // 0 = off, else seconds
  doctorCanSelfSave: boolean;
}

export interface GameState {
  phase: GamePhase;
  roundNumber: number;
  alivePlayers: string[];     // IDs
  eliminatedPlayers: string[];// IDs
  nightActions: {
    mafiaTarget: string | null;
    doctorSave: string | null;
    detectiveCheck: string | null;
  };
  voteResults: Record<string, string>; // VoterId -> TargetId
  winner: Team | null;
  lastEliminated: string | null; // Used for announcement
  nightDeath: string | null; // ID of who died in the night, or "nobody"
  detectiveResult: { targetId: string, isMafia: boolean } | null;
}

export interface RoleConfig {
  mafia: number;
  doctor: number;
  detective: number;
  citizen: number;
}

export interface Lobby {
  lobbyId: string;
  hostId: string;
  status: 'waiting' | 'in_progress' | 'finished' | 'paused';
  settings: LobbySettings;
  roleConfig: RoleConfig;
  players: Player[];
  gameState: GameState;
}

// Socket Events Definition
export interface ServerToClientEvents {
  gameStateUpdate: (lobby: Lobby) => void;
  privatePlayerUpdate: (player: Player) => void;
  error: (msg: string) => void;
}

export interface ClientToServerEvents {
  createLobby: (data: { displayName: string, sessionId: string }, callback: (lobbyId: string) => void) => void;
  joinLobby: (data: { lobbyId: string, displayName: string, sessionId: string }, callback: (success: boolean, msg?: string) => void) => void;
  reconnectLobby: (data: { lobbyId: string, sessionId: string }) => void;
  updateSettings: (settings: Partial<LobbySettings>) => void;
  updateRoleConfig: (data: { lobbyId: string, config: RoleConfig }) => void;
  toggleReady: () => void;
  startGame: () => void;
  submitNightAction: (targetId: string) => void;
  continueToNextPhase: () => void; // Acknowledging announcements
  submitVote: (targetId: string | 'skip') => void;
  playAgain: (lobbyId: string) => void;
  kickPlayer: (data: { lobbyId: string, targetId: string }) => void;
  forceAdvancePhase: (lobbyId: string) => void;
  pauseGame: (lobbyId: string) => void;
  resumeGame: (lobbyId: string) => void;
}

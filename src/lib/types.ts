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
  status: 'waiting' | 'in_progress' | 'finished';
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
  createLobby: (displayName: string, callback: (lobbyId: string) => void) => void;
  joinLobby: (lobbyId: string, displayName: string, callback: (success: boolean, msg?: string) => void) => void;
  updateSettings: (settings: Partial<LobbySettings>) => void;
  updateRoleConfig: (config: RoleConfig) => void;
  toggleReady: () => void;
  startGame: () => void;
  submitNightAction: (targetId: string) => void;
  continueToNextPhase: () => void; // Acknowledging announcements
  submitVote: (targetId: string | 'skip') => void;
  playAgain: () => void;
}

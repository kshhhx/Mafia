export type CivilianRole =
  | 'Bystander'
  | 'Nurse'
  | 'Bodyguard'
  | 'Vixen'
  | 'Hypnotist'
  | 'Journalist'
  | 'Detective'
  | 'Jailer'
  | 'Priest'
  | 'Judge'
  | 'Sheriff';

export type MafiaRole = 'Thug' | 'Thief' | 'Lawyer' | 'Godfather' | 'Snitch';
export type YakuzaRole = 'Yakuza';
export type LonerRole = 'FemmeFatale' | 'Impostor' | 'Psycho';

export type Role = CivilianRole | MafiaRole | YakuzaRole | LonerRole;
export type Team = 'Civilians' | 'Mafia' | 'Yakuza' | 'Loner';
export type GamePhase = 'lobby' | 'role_reveal' | 'night' | 'day' | 'voting' | 'result' | 'ended';
export type GameMode = 'classic' | 'loner' | 'yakuza';
export type HostRoleMode = 'player' | 'moderator';
export type AnnouncementMode = 'manual' | 'ai';

export type AbilityAction =
  | 'kill'
  | 'investigate'
  | 'protect'
  | 'block'
  | 'compare'
  | 'silence'
  | 'badmouth'
  | 'hypnotize'
  | 'jail'
  | null;

export interface InvestigationResult {
  targetId?: string;
  role?: Role;
  team?: Team;
  compareTargetIds?: string[];
  sameTeam?: boolean;
  message?: string;
}

export interface Player {
  playerId: string;
  socketId: string;
  displayName: string;
  isAlive: boolean;
  role: Role | null;
  team: Team | null;
  isReady: boolean;
  currentVote: string | null;
  mafiaVoteTarget: string | null;
  yakuzaVoteTarget: string | null;
  abilityTarget: string | null;
  secondaryAbilityTarget: string | null;
  abilityAction: AbilityAction;
  readyToContinue: boolean;
  investigationResult?: InvestigationResult;
  isJailed: boolean;
  isSilenced: boolean;
  hypnotizedBy: string | null;
  badmouthedTargetId: string | null;
  revealedToPlayerIds: string[];
}

export interface LobbySettings {
  revealRoleOnDeath: boolean;
  discussionTimer: number;
  nightActionTimer: number;
  mysteryMode: boolean;
  mode: GameMode;
  intendedPlayerCount: number;
  hostRoleMode: HostRoleMode;
  announcementMode: AnnouncementMode;
}

export interface GameState {
  phase: GamePhase;
  roundNumber: number;
  alivePlayers: string[];
  eliminatedPlayers: string[];
  voteResults: Record<string, number>;
  voteBreakdown: Record<string, string>;
  winner: Team | 'Draw' | null;
  lastEliminated: string | null;
  nightDeaths: string[];
  firstNight: boolean;
  jailedPlayerIds: string[];
  dawnAnnouncements: string[];
}

export interface RoleConfig {
  bystander: number;
  nurse: number;
  bodyguard: number;
  vixen: number;
  hypnotist: number;
  journalist: number;
  detective: number;
  jailer: number;
  priest: number;
  judge: number;
  sheriff: number;
  thug: number;
  thief: number;
  lawyer: number;
  godfather: number;
  snitch: number;
  yakuza: number;
  femmeFatale: number;
  impostor: number;
  psycho: number;
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

export interface ServerToClientEvents {
  gameStateUpdate: (lobby: Lobby) => void;
  privatePlayerUpdate: (player: Player) => void;
  error: (msg: string) => void;
}

export interface ClientToServerEvents {
  createLobby: (data: { displayName: string; sessionId: string }, callback: (lobbyId: string) => void) => void;
  joinLobby: (data: { lobbyId: string; displayName: string; sessionId: string }, callback: (success: boolean, msg?: string) => void) => void;
  reconnectLobby: (data: { lobbyId: string; sessionId: string }) => void;
  updateRoleConfig: (data: { lobbyId: string; config: RoleConfig }) => void;
  updateSettings: (data: { lobbyId: string; settings: Partial<LobbySettings> }) => void;
  startGame: () => void;
  submitNightAction: (data: {
    lobbyId: string;
    mafiaTargetId?: string | null;
    yakuzaTargetId?: string | null;
    abilityTargetId?: string | null;
    secondaryAbilityTargetId?: string | null;
    abilityAction?: AbilityAction;
  }) => void;
  continueToNextPhase: () => void;
  submitVote: (targetId: string | 'skip') => void;
  playAgain: (lobbyId: string) => void;
  kickPlayer: (data: { lobbyId: string; targetId: string }) => void;
  forceAdvancePhase: (lobbyId: string) => void;
  pauseGame: (lobbyId: string) => void;
  resumeGame: (lobbyId: string) => void;
}

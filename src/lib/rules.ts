import type { Role, RoleConfig } from './types';

export const ROLE_BRIEFS: Record<Role, { summary: string; ability: string; minPlayers: number }> = {
  Bystander: {
    summary: 'Core civilian with no night action.',
    ability: 'Survive the debate and help eliminate all criminal teams.',
    minPlayers: 6,
  },
  Nurse: {
    summary: 'Specialist protector.',
    ability: 'Protect one player from dying that night.',
    minPlayers: 8,
  },
  Bodyguard: {
    summary: 'Sacrificial protector.',
    ability: 'Protect one player. If they would die, you die instead.',
    minPlayers: 10,
  },
  Vixen: {
    summary: 'Disruption specialist.',
    ability: 'Block one player’s ability and make them immune to death for the night.',
    minPlayers: 14,
  },
  Hypnotist: {
    summary: 'Vote-control specialist.',
    ability: 'Force one player’s next vote to count the same as yours.',
    minPlayers: 10,
  },
  Journalist: {
    summary: 'Team-comparison specialist.',
    ability: 'Compare two players to learn whether they are on the same team.',
    minPlayers: 10,
  },
  Detective: {
    summary: 'Default civilian leader.',
    ability: 'Each night, either investigate a player or kill one.',
    minPlayers: 6,
  },
  Jailer: {
    summary: 'Control-focused leader.',
    ability: 'Investigate a player and jail them if they are Mafia or Yakuza.',
    minPlayers: 10,
  },
  Priest: {
    summary: 'Leader with reveal tradeoff.',
    ability: 'Investigate or kill a player, but investigated targets learn you are the Priest.',
    minPlayers: 10,
  },
  Judge: {
    summary: 'Voting-power leader.',
    ability: 'Investigate one player and count as two votes during the day.',
    minPlayers: 10,
  },
  Sheriff: {
    summary: 'Pure kill leader.',
    ability: 'Kill one player each night.',
    minPlayers: 10,
  },
  Thug: {
    summary: 'Core Mafia role.',
    ability: 'No personal action, but joins the shared Mafia kill vote.',
    minPlayers: 6,
  },
  Thief: {
    summary: 'Mafia blocker.',
    ability: 'Join the Mafia kill and block one player’s ability.',
    minPlayers: 10,
  },
  Lawyer: {
    summary: 'Mafia investigator.',
    ability: 'Join the Mafia kill and investigate one player.',
    minPlayers: 16,
  },
  Godfather: {
    summary: 'Mafia silencer.',
    ability: 'Join the Mafia kill and silence one player for the next day vote.',
    minPlayers: 12,
  },
  Snitch: {
    summary: 'Mafia deception role.',
    ability: 'Join the Mafia kill and make one player read as a Thug to investigations.',
    minPlayers: 12,
  },
  Yakuza: {
    summary: 'Separate criminal faction.',
    ability: 'Acts like its own crime team and performs a separate night kill.',
    minPlayers: 12,
  },
  FemmeFatale: {
    summary: 'Loner killer.',
    ability: 'Kill one player, except Bystanders survive your attack.',
    minPlayers: 10,
  },
  Impostor: {
    summary: 'Loner infiltrator.',
    ability: 'Pretends to be Mafia and joins their wake-up flow.',
    minPlayers: 10,
  },
  Psycho: {
    summary: 'Loner assassin.',
    ability: 'Kill one player each night while trying to outlast everyone.',
    minPlayers: 10,
  },
};

export const ROLE_CONFIG_TO_ROLE: Record<keyof RoleConfig, Role> = {
  bystander: 'Bystander',
  nurse: 'Nurse',
  bodyguard: 'Bodyguard',
  vixen: 'Vixen',
  hypnotist: 'Hypnotist',
  journalist: 'Journalist',
  detective: 'Detective',
  jailer: 'Jailer',
  priest: 'Priest',
  judge: 'Judge',
  sheriff: 'Sheriff',
  thug: 'Thug',
  thief: 'Thief',
  lawyer: 'Lawyer',
  godfather: 'Godfather',
  snitch: 'Snitch',
  yakuza: 'Yakuza',
  femmeFatale: 'FemmeFatale',
  impostor: 'Impostor',
  psycho: 'Psycho',
};

export const GAME_HELP = {
  overview:
    'One host creates the room, sets the expected player count, and starts once everyone has joined. Players reveal roles privately, complete night actions when prompted, discuss the dawn results, and vote during the day.',
  interface:
    'Use the bottom action button whenever the app asks you to lock in a choice. If nothing is shown for your role during a phase, wait for the rest of the table. The top-right help button stays available throughout the game.',
  flow: [
    'Lobby: host sets the expected table size, reviews the suggested cast, and starts the game.',
    'Role Reveal: each player privately checks their role before continuing.',
    'Night: only roles with actions see inputs; everyone else waits.',
    'Day: read the dawn results and discuss suspects.',
    'Voting: each eligible player casts one vote or abstains.',
  ],
};

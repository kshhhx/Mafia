const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.RENDER ? '0.0.0.0' : '127.0.0.1';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

const lobbies = new Map();

const ROLE_TEAM = {
  Bystander: 'Civilians',
  Nurse: 'Civilians',
  Bodyguard: 'Civilians',
  Vixen: 'Civilians',
  Hypnotist: 'Civilians',
  Journalist: 'Civilians',
  Detective: 'Civilians',
  Jailer: 'Civilians',
  Priest: 'Civilians',
  Judge: 'Civilians',
  Sheriff: 'Civilians',
  Thug: 'Mafia',
  Thief: 'Mafia',
  Lawyer: 'Mafia',
  Godfather: 'Mafia',
  Snitch: 'Mafia',
  Yakuza: 'Yakuza',
  FemmeFatale: 'Loner',
  Impostor: 'Loner',
  Psycho: 'Loner',
};

const ROLE_ORDER = [
  { key: 'bystander', role: 'Bystander' },
  { key: 'nurse', role: 'Nurse' },
  { key: 'bodyguard', role: 'Bodyguard' },
  { key: 'vixen', role: 'Vixen' },
  { key: 'hypnotist', role: 'Hypnotist' },
  { key: 'journalist', role: 'Journalist' },
  { key: 'detective', role: 'Detective' },
  { key: 'jailer', role: 'Jailer' },
  { key: 'priest', role: 'Priest' },
  { key: 'judge', role: 'Judge' },
  { key: 'sheriff', role: 'Sheriff' },
  { key: 'thug', role: 'Thug' },
  { key: 'thief', role: 'Thief' },
  { key: 'lawyer', role: 'Lawyer' },
  { key: 'godfather', role: 'Godfather' },
  { key: 'snitch', role: 'Snitch' },
  { key: 'yakuza', role: 'Yakuza' },
  { key: 'femmeFatale', role: 'FemmeFatale' },
  { key: 'impostor', role: 'Impostor' },
  { key: 'psycho', role: 'Psycho' },
];

const CLASSIC_SETUP = {
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

function emptyRoleConfig() {
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

function generateRoomCode() {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
  } while (lobbies.has(code));
  return code;
}

function getRecommendedClassicConfig(playerCount) {
  return {
    ...emptyRoleConfig(),
    ...(CLASSIC_SETUP[playerCount] || { bystander: Math.max(0, playerCount - 2), detective: playerCount >= 6 ? 1 : 0, thug: playerCount >= 6 ? 1 : 0 }),
  };
}

function cloneConfig(config = {}) {
  return { ...emptyRoleConfig(), ...config };
}

function createPlayer({ playerId, socketId, displayName }) {
  return {
    playerId,
    socketId,
    displayName,
    isAlive: true,
    role: null,
    team: null,
    isReady: false,
    currentVote: null,
    mafiaVoteTarget: null,
    yakuzaVoteTarget: null,
    abilityTarget: null,
    secondaryAbilityTarget: null,
    abilityAction: null,
    readyToContinue: false,
    investigationResult: undefined,
    isJailed: false,
    isSilenced: false,
    hypnotizedBy: null,
    badmouthedTargetId: null,
    revealedToPlayerIds: [],
  };
}

function createLobbyState(hostPlayer) {
  return {
    lobbyId: generateRoomCode(),
    hostId: hostPlayer.playerId,
    status: 'waiting',
    settings: {
      revealRoleOnDeath: true,
      discussionTimer: 0,
      nightActionTimer: 0,
      mysteryMode: false,
      mode: 'classic',
      intendedPlayerCount: 6,
      hostRoleMode: 'player',
      announcementMode: 'manual',
    },
    roleConfig: getRecommendedClassicConfig(6),
    players: [hostPlayer],
    gameState: {
      phase: 'lobby',
      roundNumber: 0,
      alivePlayers: [hostPlayer.playerId],
      eliminatedPlayers: [],
      voteResults: {},
      winner: null,
      lastEliminated: null,
      nightDeaths: [],
      firstNight: true,
      jailedPlayerIds: [],
      dawnAnnouncements: [],
    },
  };
}

function hostIsModerator(lobby) {
  return lobby.settings.hostRoleMode === 'moderator';
}

function isParticipant(lobby, player) {
  return !(hostIsModerator(lobby) && player.playerId === lobby.hostId);
}

function participantPlayers(lobby) {
  return lobby.players.filter((player) => isParticipant(lobby, player));
}

function getPlayer(lobby, socketId) {
  return lobby?.players.find((player) => player.socketId === socketId);
}

function isHost(lobby, socketId) {
  const player = getPlayer(lobby, socketId);
  return Boolean(lobby && player && lobby.hostId === player.playerId);
}

function syncAlivePlayers(lobby) {
  lobby.gameState.alivePlayers = lobby.players.filter((player) => player.isAlive && isParticipant(lobby, player)).map((player) => player.playerId);
}

function totalConfiguredRoles(config) {
  return Object.values(config).reduce((sum, count) => sum + count, 0);
}

function hasRoleInConfig(config, keys) {
  return keys.some((key) => (config[key] || 0) > 0);
}

function validateConfig(lobby) {
  const config = lobby.roleConfig;
  const total = totalConfiguredRoles(config);
  const playerCount = participantPlayers(lobby).length;
  if (total !== playerCount) return 'Role count must match player count';
  if (playerCount < lobby.settings.intendedPlayerCount) return 'Wait for the rest of the table to join before starting';
  if (lobby.settings.mode === 'classic' && (config.yakuza || config.femmeFatale || config.impostor || config.psycho)) {
    return 'Classic mode cannot include Yakuza or Loner roles';
  }
  if (lobby.settings.mode === 'loner' && config.yakuza > 0) {
    return 'Loner mode cannot include Yakuza roles';
  }
  if (lobby.settings.mode === 'yakuza' && hasRoleInConfig(config, ['thief', 'lawyer', 'godfather', 'snitch'])) {
    return 'Yakuza mode cannot include Mafia mobsters';
  }
  if (lobby.settings.mode === 'yakuza' && config.yakuza === 0) {
    return 'Yakuza mode needs at least one Yakuza role';
  }
  if (lobby.settings.mode === 'loner' && config.femmeFatale + config.impostor + config.psycho !== 1) {
    return 'Loner mode needs exactly one Loner role';
  }
  return null;
}

function buildRolePool(config) {
  const roles = [];
  for (const entry of ROLE_ORDER) {
    const count = config[entry.key] || 0;
    for (let index = 0; index < count; index += 1) {
      roles.push({ role: entry.role, team: ROLE_TEAM[entry.role] });
    }
  }
  return roles.sort(() => Math.random() - 0.5);
}

function resetPlayerRoundState(player) {
  player.currentVote = null;
  player.mafiaVoteTarget = null;
  player.yakuzaVoteTarget = null;
  player.abilityTarget = null;
  player.secondaryAbilityTarget = null;
  player.abilityAction = null;
  player.readyToContinue = false;
  player.investigationResult = undefined;
  player.badmouthedTargetId = null;
  player.revealedToPlayerIds = [];
}

function resetDayStatuses(lobby) {
  const jailerAlive = lobby.players.some((player) => player.isAlive && player.role === 'Jailer');
  lobby.players.forEach((player) => {
    player.isSilenced = false;
    player.hypnotizedBy = null;
    if (!jailerAlive) {
      player.isJailed = false;
    }
  });
  lobby.gameState.jailedPlayerIds = jailerAlive
    ? lobby.players.filter((player) => player.isJailed && player.isAlive).map((player) => player.playerId)
    : [];
}

function resetForNewGame(lobby) {
  lobby.status = 'waiting';
  lobby.gameState = {
    phase: 'lobby',
    roundNumber: 0,
    alivePlayers: participantPlayers(lobby).map((player) => player.playerId),
    eliminatedPlayers: [],
    voteResults: {},
    winner: null,
    lastEliminated: null,
    nightDeaths: [],
    firstNight: true,
    jailedPlayerIds: [],
    dawnAnnouncements: [],
  };

  lobby.players.forEach((player) => {
    player.isAlive = isParticipant(lobby, player);
    player.role = null;
    player.team = null;
    player.isReady = false;
    player.isJailed = false;
    player.isSilenced = false;
    player.hypnotizedBy = null;
    resetPlayerRoundState(player);
  });
}

function emitPrivateUpdates(lobby, io) {
  lobby.players.forEach((player) => {
    io.to(player.socketId).emit('privatePlayerUpdate', player);
  });
}

function finishGame(lobby, io) {
  lobby.gameState.phase = 'ended';
  lobby.status = 'finished';
  io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
}

function mafiaParticipants(lobby) {
  return lobby.players.filter((player) => player.isAlive && (player.team === 'Mafia' || player.role === 'Impostor'));
}

function yakuzaParticipants(lobby) {
  return lobby.players.filter((player) => player.isAlive && player.team === 'Yakuza');
}

function teamCount(lobby, team) {
  return lobby.players.filter((player) => player.isAlive && player.team === team).length;
}

function checkWinCondition(lobby) {
  const mafia = teamCount(lobby, 'Mafia');
  const civilians = teamCount(lobby, 'Civilians');
  const yakuza = teamCount(lobby, 'Yakuza');
  const loner = teamCount(lobby, 'Loner');
  const alivePlayers = lobby.players.filter((player) => player.isAlive && isParticipant(lobby, player));

  if (lobby.settings.mode === 'yakuza') {
    if (alivePlayers.length === 2 && mafia === 1 && yakuza === 1) {
      lobby.gameState.winner = 'Draw';
      return true;
    }
    if (mafia === 0 && yakuza > 0 && civilians <= yakuza) {
      lobby.gameState.winner = 'Yakuza';
      return true;
    }
    if (yakuza === 0 && mafia > 0 && civilians <= mafia) {
      lobby.gameState.winner = 'Mafia';
      return true;
    }
    if (mafia === 0 && yakuza === 0) {
      lobby.gameState.winner = 'Civilians';
      return true;
    }
    return false;
  }

  if (lobby.settings.mode === 'loner') {
    if (alivePlayers.length === 1 && loner === 1) {
      lobby.gameState.winner = 'Loner';
      return true;
    }
    if (mafia === 0) {
      lobby.gameState.winner = 'Civilians';
      return true;
    }
    if (mafia >= civilians) {
      lobby.gameState.winner = loner > 0 ? 'Loner' : 'Mafia';
      return true;
    }
    return false;
  }

  if (mafia === 0) {
    lobby.gameState.winner = 'Civilians';
    return true;
  }
  if (mafia >= civilians) {
    lobby.gameState.winner = 'Mafia';
    return true;
  }
  return false;
}

function getAllowedActions(role) {
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

function needsAbility(role) {
  return getAllowedActions(role).length > 0;
}

function needsMafiaVote(player, lobby) {
  if (!player.isAlive || lobby.gameState.firstNight) return false;
  return player.team === 'Mafia' || player.role === 'Impostor';
}

function needsYakuzaVote(player, lobby) {
  if (!player.isAlive || lobby.gameState.firstNight) return false;
  return player.team === 'Yakuza';
}

function isNightActionComplete(player, lobby) {
  if (!player.isAlive || !player.role) return true;
  if (player.isJailed) return true;

  const mafiaDone = !needsMafiaVote(player, lobby) || player.mafiaVoteTarget !== null;
  const yakuzaDone = !needsYakuzaVote(player, lobby) || player.yakuzaVoteTarget !== null;
  const abilityNeeded = needsAbility(player.role);
  const action = player.abilityAction;

  let abilityDone = true;
  if (abilityNeeded) {
    if (!action) {
      abilityDone = false;
    } else if (action === 'compare') {
      abilityDone = Boolean(player.abilityTarget && player.secondaryAbilityTarget);
    } else {
      abilityDone = Boolean(player.abilityTarget);
    }
  }

  return mafiaDone && yakuzaDone && abilityDone;
}

function maskForSnitch(target, snitchTargetId) {
  if (target.playerId === snitchTargetId) {
    return { role: 'Thug', team: 'Mafia' };
  }
  return { role: target.role, team: target.team };
}

function markEliminated(lobby, playerId, eliminatedSet) {
  const player = lobby.players.find((candidate) => candidate.playerId === playerId);
  if (!player || !player.isAlive) return;
  player.isAlive = false;
  eliminatedSet.add(player.playerId);
}

function chooseMajority(votes) {
  if (votes.length === 0) return null;
  const counts = {};
  let winnerId = null;
  let maxVotes = 0;
  let tie = false;

  for (const vote of votes) {
    counts[vote] = (counts[vote] || 0) + 1;
    if (counts[vote] > maxVotes) {
      maxVotes = counts[vote];
      winnerId = vote;
      tie = false;
    } else if (counts[vote] === maxVotes) {
      tie = true;
    }
  }

  return tie ? null : winnerId;
}

function startNightPhase(lobby, io) {
  lobby.gameState.phase = 'night';
  lobby.gameState.roundNumber += 1;
  lobby.gameState.nightDeaths = [];
  lobby.gameState.lastEliminated = null;
  lobby.gameState.voteResults = {};
  lobby.gameState.dawnAnnouncements = [];
  lobby.players.forEach(resetPlayerRoundState);
  io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
  emitPrivateUpdates(lobby, io);
}

function resolveNightPhase(lobby, io) {
  const firstNight = lobby.gameState.firstNight;
  const dawnAnnouncements = [];
  const alivePlayers = lobby.players.filter((player) => player.isAlive);
  const blockedPlayers = new Set();
  const killImmunePlayers = new Set();
  const protectedPlayers = new Set();
  const bodyguardTargets = new Map();
  const hypnotizedTargets = [];
  const silencedPlayers = new Set();
  const snitchTargets = [];
  const eliminatedSet = new Set();
  const investigationUpdates = [];
  const priestRevealUpdates = [];
  const jailedNow = [];

  for (const player of alivePlayers) {
    if (player.role === 'Thief' && player.abilityAction === 'block' && player.abilityTarget) {
      blockedPlayers.add(player.abilityTarget);
    }
    if (player.role === 'Vixen' && player.abilityAction === 'block' && player.abilityTarget) {
      blockedPlayers.add(player.abilityTarget);
      killImmunePlayers.add(player.abilityTarget);
    }
    if (player.role === 'Snitch' && player.abilityAction === 'badmouth' && player.abilityTarget) {
      snitchTargets.push(player.abilityTarget);
    }
  }

  const badmouthedTargetId = snitchTargets[snitchTargets.length - 1] || null;

  for (const player of alivePlayers) {
    if (blockedPlayers.has(player.playerId) || player.isJailed) continue;

    if ((player.role === 'Nurse' || player.role === 'Bodyguard') && player.abilityAction === 'protect' && player.abilityTarget) {
      if (player.role === 'Nurse') protectedPlayers.add(player.abilityTarget);
      if (player.role === 'Bodyguard') bodyguardTargets.set(player.abilityTarget, player.playerId);
    }

    if (player.role === 'Hypnotist' && player.abilityAction === 'hypnotize' && player.abilityTarget) {
      hypnotizedTargets.push({ targetId: player.abilityTarget, hypnotistId: player.playerId });
    }

    if (player.role === 'Godfather' && player.abilityAction === 'silence' && player.abilityTarget) {
      silencedPlayers.add(player.abilityTarget);
    }

    const investigateRole = ['Detective', 'Priest', 'Judge', 'Jailer', 'Lawyer'].includes(player.role);
    if (investigateRole && player.abilityAction === 'investigate' && player.abilityTarget) {
      const target = lobby.players.find((candidate) => candidate.playerId === player.abilityTarget);
      if (target) {
        const masked = maskForSnitch(target, badmouthedTargetId);
        investigationUpdates.push({
          playerId: player.playerId,
          result: {
            targetId: target.playerId,
            role: masked.role,
            team: masked.team,
          },
        });

        if (player.role === 'Jailer' && target.team !== 'Loner' && (target.team === 'Mafia' || target.team === 'Yakuza')) {
          target.isJailed = true;
          jailedNow.push(target.playerId);
        }

        if (player.role === 'Priest') {
          priestRevealUpdates.push({ targetId: target.playerId, priestId: player.playerId });
        }
      }
    }

    if (player.role === 'Journalist' && player.abilityAction === 'compare' && player.abilityTarget && player.secondaryAbilityTarget) {
      const left = lobby.players.find((candidate) => candidate.playerId === player.abilityTarget);
      const right = lobby.players.find((candidate) => candidate.playerId === player.secondaryAbilityTarget);
      if (left && right) {
        investigationUpdates.push({
          playerId: player.playerId,
          result: {
            compareTargetIds: [left.playerId, right.playerId],
            sameTeam: left.team === right.team,
            message: left.team === right.team ? 'These two players are on the same team.' : 'These two players are on opposing teams.',
          },
        });
      }
    }
  }

  const scheduledKills = [];

  if (!firstNight) {
    const mafiaTarget = chooseMajority(
      mafiaParticipants(lobby)
        .filter((player) => !player.isJailed)
        .map((player) => player.mafiaVoteTarget)
        .filter(Boolean),
    );
    if (mafiaTarget) scheduledKills.push({ targetId: mafiaTarget, source: 'Mafia' });

    const yakuzaTarget = chooseMajority(
      yakuzaParticipants(lobby)
        .filter((player) => !player.isJailed)
        .map((player) => player.yakuzaVoteTarget)
        .filter(Boolean),
    );
    if (yakuzaTarget) scheduledKills.push({ targetId: yakuzaTarget, source: 'Yakuza' });
  }

  for (const player of alivePlayers) {
    if (blockedPlayers.has(player.playerId) || player.isJailed) continue;
    if (player.abilityAction !== 'kill' || !player.abilityTarget || firstNight) continue;
    scheduledKills.push({ targetId: player.abilityTarget, source: player.role });
  }

  for (const kill of scheduledKills) {
    const victim = lobby.players.find((candidate) => candidate.playerId === kill.targetId);
    if (!victim || !victim.isAlive) continue;
    if (killImmunePlayers.has(victim.playerId)) continue;
    if (protectedPlayers.has(victim.playerId)) continue;

    if (kill.source === 'FemmeFatale' && victim.role === 'Bystander') {
      continue;
    }

    const bodyguardId = bodyguardTargets.get(victim.playerId);
    if (bodyguardId) {
      markEliminated(lobby, bodyguardId, eliminatedSet);
      continue;
    }

    markEliminated(lobby, victim.playerId, eliminatedSet);
  }

  lobby.gameState.firstNight = false;
  lobby.gameState.nightDeaths = Array.from(eliminatedSet);
  lobby.gameState.phase = 'day';
  syncAlivePlayers(lobby);

  if (!lobby.players.some((player) => player.isAlive && player.role === 'Jailer')) {
    lobby.players.forEach((player) => {
      player.isJailed = false;
    });
  }

  hypnotizedTargets.forEach(({ targetId, hypnotistId }) => {
    const target = lobby.players.find((player) => player.playerId === targetId && player.isAlive);
    if (target) target.hypnotizedBy = hypnotistId;
  });

  silencedPlayers.forEach((playerId) => {
    const player = lobby.players.find((candidate) => candidate.playerId === playerId && candidate.isAlive);
    if (player) {
      player.isSilenced = true;
      dawnAnnouncements.push(`${player.displayName} has been silenced and cannot vote today.`);
    }
  });

  lobby.gameState.jailedPlayerIds = lobby.players.filter((player) => player.isJailed && player.isAlive).map((player) => player.playerId);
  if (lobby.gameState.jailedPlayerIds.length > 0) {
    const names = lobby.players
      .filter((player) => lobby.gameState.jailedPlayerIds.includes(player.playerId))
      .map((player) => player.displayName)
      .join(', ');
    dawnAnnouncements.push(`In jail: ${names}.`);
  }

  lobby.gameState.dawnAnnouncements = dawnAnnouncements;
  lobby.gameState.eliminatedPlayers = lobby.players.filter((player) => !player.isAlive).map((player) => player.playerId);

  investigationUpdates.forEach((entry) => {
    const player = lobby.players.find((candidate) => candidate.playerId === entry.playerId);
    if (player) {
      player.investigationResult = entry.result;
      io.to(player.socketId).emit('privatePlayerUpdate', player);
    }
  });

  priestRevealUpdates.forEach((entry) => {
    const target = lobby.players.find((candidate) => candidate.playerId === entry.targetId);
    const priest = lobby.players.find((candidate) => candidate.playerId === entry.priestId);
    if (target && priest) {
      target.investigationResult = {
        message: `${priest.displayName} is the Priest.`,
      };
      io.to(target.socketId).emit('privatePlayerUpdate', target);
    }
  });

  if (checkWinCondition(lobby)) {
    finishGame(lobby, io);
    return;
  }

  io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
}

function resolveVotingPhase(lobby, io) {
  const voteEntries = [];

  for (const player of lobby.players.filter((candidate) => candidate.isAlive)) {
    if (player.isJailed || player.isSilenced) continue;

    let countedVote = player.currentVote;
    if (player.hypnotizedBy) {
      const hypnotist = lobby.players.find((candidate) => candidate.playerId === player.hypnotizedBy);
      if (hypnotist?.currentVote) countedVote = hypnotist.currentVote;
    }
    if (!countedVote) continue;
    if (countedVote === 'skip') continue;

    const weight = player.role === 'Judge' ? 2 : 1;
    for (let count = 0; count < weight; count += 1) {
      voteEntries.push(countedVote);
    }
  }

  const winnerId = chooseMajority(voteEntries);
  lobby.gameState.lastEliminated = null;

  if (winnerId) {
    const victim = lobby.players.find((player) => player.playerId === winnerId);
    if (victim && victim.isAlive) {
      victim.isAlive = false;
      lobby.gameState.lastEliminated = victim.playerId;
    }
  }

  lobby.gameState.voteResults = {};
  lobby.players.forEach((player) => {
    player.currentVote = null;
    player.readyToContinue = false;
  });

  if (!lobby.players.some((player) => player.isAlive && player.role === 'Jailer')) {
    lobby.players.forEach((player) => {
      player.isJailed = false;
    });
  }

  syncAlivePlayers(lobby);
  lobby.gameState.eliminatedPlayers = lobby.players.filter((player) => !player.isAlive).map((player) => player.playerId);
  lobby.gameState.phase = 'result';
  lobby.gameState.dawnAnnouncements = [];

  if (checkWinCondition(lobby)) {
    finishGame(lobby, io);
    return;
  }

  io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
  emitPrivateUpdates(lobby, io);
}

app.prepare().then(() => {
  const expressApp = express();
  const httpServer = createServer(expressApp);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    socket.on('createLobby', ({ displayName, sessionId }, callback) => {
      const hostPlayer = createPlayer({ playerId: sessionId, socketId: socket.id, displayName });
      const newLobby = createLobbyState(hostPlayer);

      lobbies.set(newLobby.lobbyId, newLobby);
      socket.join(newLobby.lobbyId);
      callback(newLobby.lobbyId);
      io.to(newLobby.lobbyId).emit('gameStateUpdate', newLobby);
      socket.emit('privatePlayerUpdate', newLobby.players[0]);
    });

    socket.on('joinLobby', ({ lobbyId, displayName, sessionId }, callback) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return callback(false, 'Lobby not found');
      if (lobby.status !== 'waiting') return callback(false, 'Game already in progress');
      if (lobby.players.some((player) => player.playerId === sessionId)) {
        return callback(false, 'Already in lobby. Please join via the link or refresh.');
      }

      const newPlayer = createPlayer({ playerId: sessionId, socketId: socket.id, displayName });
      lobby.players.push(newPlayer);
      lobby.settings.intendedPlayerCount = Math.max(lobby.settings.intendedPlayerCount, participantPlayers(lobby).length);
      if (lobby.settings.mode === 'classic') {
        lobby.roleConfig = getRecommendedClassicConfig(lobby.settings.intendedPlayerCount);
      }
      syncAlivePlayers(lobby);
      socket.join(lobbyId);
      callback(true);
      io.to(lobbyId).emit('gameStateUpdate', lobby);
      socket.emit('privatePlayerUpdate', newPlayer);
    });

    socket.on('updateSettings', ({ lobbyId, settings }) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id) || lobby.status !== 'waiting') return;
      const minCount = hostIsModerator(lobby) || settings.hostRoleMode === 'moderator' ? 0 : 1;
      const intendedPlayerCount = settings.intendedPlayerCount == null
        ? lobby.settings.intendedPlayerCount
        : Math.max(minCount, Math.min(16, settings.intendedPlayerCount));
      lobby.settings = { ...lobby.settings, ...settings, intendedPlayerCount };
      lobby.settings.intendedPlayerCount = Math.max(
        lobby.settings.intendedPlayerCount,
        participantPlayers(lobby).length,
      );
      if (lobby.settings.mode === 'classic') {
        lobby.roleConfig = getRecommendedClassicConfig(lobby.settings.intendedPlayerCount);
      }
      lobby.players.forEach((player) => {
        player.isAlive = player.role ? player.isAlive : isParticipant(lobby, player);
      });
      syncAlivePlayers(lobby);
      io.to(lobbyId).emit('gameStateUpdate', lobby);
    });

    socket.on('updateRoleConfig', ({ lobbyId, config }) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id) || lobby.status !== 'waiting') return;
      lobby.roleConfig = cloneConfig(config);
      io.to(lobbyId).emit('gameStateUpdate', lobby);
    });

    socket.on('startGame', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id)) return;

      const configError = validateConfig(lobby);
      if (configError) {
        socket.emit('error', configError);
        return;
      }

      const rolePool = buildRolePool(lobby.roleConfig);
      const participants = participantPlayers(lobby);
      lobby.players.forEach((player) => {
        player.role = null;
        player.team = null;
        player.isAlive = isParticipant(lobby, player);
        player.isReady = false;
        player.isJailed = false;
        player.isSilenced = false;
        player.hypnotizedBy = null;
        resetPlayerRoundState(player);
      });
      participants.forEach((player, index) => {
        player.role = rolePool[index].role;
        player.team = rolePool[index].team;
        player.isAlive = true;
      });

      lobby.status = 'in_progress';
      lobby.gameState.phase = 'role_reveal';
      lobby.gameState.firstNight = true;
      lobby.gameState.roundNumber = 0;
      lobby.gameState.nightDeaths = [];
      lobby.gameState.lastEliminated = null;
      lobby.gameState.voteResults = {};
      lobby.gameState.winner = null;
      lobby.gameState.jailedPlayerIds = [];
      lobby.gameState.dawnAnnouncements = [];
      syncAlivePlayers(lobby);

      io.to(lobbyId).emit('gameStateUpdate', lobby);
      emitPrivateUpdates(lobby, io);
    });

    socket.on('continueToNextPhase', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;
      const player = getPlayer(lobby, socket.id);
      if (!player || !player.isAlive) return;

      player.readyToContinue = true;
      const alivePlayers = lobby.players.filter((candidate) => candidate.isAlive);
      if (!alivePlayers.every((candidate) => candidate.readyToContinue)) {
        io.to(lobbyId).emit('gameStateUpdate', lobby);
        return;
      }

      lobby.players.forEach((candidate) => {
        candidate.readyToContinue = false;
      });

      if (lobby.gameState.phase === 'role_reveal' || lobby.gameState.phase === 'result') {
        startNightPhase(lobby, io);
      } else if (lobby.gameState.phase === 'day') {
        lobby.gameState.phase = 'voting';
        io.to(lobbyId).emit('gameStateUpdate', lobby);
      }
    });

    socket.on('submitNightAction', ({
      lobbyId,
      mafiaTargetId = null,
      yakuzaTargetId = null,
      abilityTargetId = null,
      secondaryAbilityTargetId = null,
      abilityAction = null,
    }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.gameState.phase !== 'night') return;
      const player = getPlayer(lobby, socket.id);
      if (!player || !player.isAlive || !player.role) return;

      if (player.isJailed) {
        socket.emit('error', 'Jailed players cannot use abilities or participate in night actions');
        return;
      }

      if (abilityTargetId && abilityTargetId === player.playerId) {
        socket.emit('error', 'You cannot target yourself with a role ability');
        return;
      }
      if (secondaryAbilityTargetId && secondaryAbilityTargetId === player.playerId) {
        socket.emit('error', 'You cannot target yourself with a role ability');
        return;
      }

      const allowedActions = getAllowedActions(player.role);
      if (abilityAction && !allowedActions.includes(abilityAction)) {
        socket.emit('error', 'That role cannot use that action');
        return;
      }

      if (needsMafiaVote(player, lobby)) {
        if (!mafiaTargetId) {
          socket.emit('error', 'Your role must submit a Mafia target tonight');
          return;
        }
        player.mafiaVoteTarget = mafiaTargetId;
      }

      if (needsYakuzaVote(player, lobby)) {
        if (!yakuzaTargetId) {
          socket.emit('error', 'Yakuza must choose a victim each night');
          return;
        }
        player.yakuzaVoteTarget = yakuzaTargetId;
      }

      if (needsAbility(player.role)) {
        if (!abilityAction) {
          socket.emit('error', 'Your role needs an action selected');
          return;
        }
        if (abilityAction === 'compare') {
          if (!abilityTargetId || !secondaryAbilityTargetId || abilityTargetId === secondaryAbilityTargetId) {
            socket.emit('error', 'Journalist must choose two different players');
            return;
          }
        } else if (!abilityTargetId) {
          socket.emit('error', 'Your role needs a target');
          return;
        }

        player.abilityAction = abilityAction;
        player.abilityTarget = abilityTargetId;
        player.secondaryAbilityTarget = secondaryAbilityTargetId;
      }

      io.to(lobbyId).emit('gameStateUpdate', lobby);
      io.to(player.socketId).emit('privatePlayerUpdate', player);

      const activeNightPlayers = lobby.players.filter((candidate) => candidate.isAlive && (needsMafiaVote(candidate, lobby) || needsYakuzaVote(candidate, lobby) || needsAbility(candidate.role)));
      if (activeNightPlayers.every((candidate) => isNightActionComplete(candidate, lobby))) {
        resolveNightPhase(lobby, io);
      }
    });

    socket.on('submitVote', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.gameState.phase !== 'voting') return;
      const player = getPlayer(lobby, socket.id);
      if (!player || !player.isAlive || player.currentVote !== null) return;
      if (player.isJailed || player.isSilenced) {
        socket.emit('error', 'You cannot vote today');
        return;
      }

      player.currentVote = targetId;
      lobby.gameState.voteResults[player.playerId] = targetId;
      io.to(lobbyId).emit('gameStateUpdate', lobby);

      const voters = lobby.players.filter((candidate) => candidate.isAlive && !candidate.isJailed && !candidate.isSilenced);
      if (voters.every((candidate) => candidate.currentVote !== null)) {
        resolveVotingPhase(lobby, io);
      }
    });

    socket.on('reconnectLobby', ({ lobbyId, sessionId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;
      const player = lobby.players.find((candidate) => candidate.playerId === sessionId);
      if (!player) return;

      player.socketId = socket.id;
      socket.join(lobbyId);
      socket.emit('gameStateUpdate', lobby);
      socket.emit('privatePlayerUpdate', player);
    });

    socket.on('playAgain', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id)) return;
      resetForNewGame(lobby);
      io.to(lobbyId).emit('gameStateUpdate', lobby);
      emitPrivateUpdates(lobby, io);
    });

    socket.on('kickPlayer', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id) || lobby?.status !== 'waiting') return;
      const playerIndex = lobby.players.findIndex((player) => player.playerId === targetId);
      if (playerIndex === -1) return;
      lobby.players.splice(playerIndex, 1);
      lobby.settings.intendedPlayerCount = Math.max(participantPlayers(lobby).length, Math.min(lobby.settings.intendedPlayerCount, 16));
      if (lobby.settings.mode === 'classic') {
        lobby.roleConfig = getRecommendedClassicConfig(lobby.settings.intendedPlayerCount);
      }
      syncAlivePlayers(lobby);
      io.to(lobbyId).emit('gameStateUpdate', lobby);
    });

    socket.on('pauseGame', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id)) return;
      lobby.status = 'paused';
      io.to(lobbyId).emit('gameStateUpdate', lobby);
    });

    socket.on('resumeGame', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id) || lobby.status !== 'paused') return;
      lobby.status = 'in_progress';
      io.to(lobbyId).emit('gameStateUpdate', lobby);
    });

    socket.on('forceAdvancePhase', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!isHost(lobby, socket.id)) return;
      lobby.players.forEach((player) => {
        player.readyToContinue = false;
      });

      if (lobby.gameState.phase === 'role_reveal' || lobby.gameState.phase === 'result') {
        startNightPhase(lobby, io);
      } else if (lobby.gameState.phase === 'night') {
        resolveNightPhase(lobby, io);
      } else if (lobby.gameState.phase === 'day') {
        lobby.gameState.phase = 'voting';
        io.to(lobbyId).emit('gameStateUpdate', lobby);
      } else if (lobby.gameState.phase === 'voting') {
        resolveVotingPhase(lobby, io);
      }
    });
  });

  expressApp.all('*', (req, res) => handle(req, res));

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

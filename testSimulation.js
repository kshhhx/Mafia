const { io } = require('socket.io-client');

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTest() {
  console.log('Starting Mafia: Vendetta integration test with 8 simulated players...');

  const clients = Array.from({ length: 8 }, () => io('http://127.0.0.1:3001'));
  const states = clients.map(() => ({ me: null, lobby: null }));
  let connectedCount = 0;
  let lobbyId = '';

  clients.forEach((client, index) => {
    client.on('connect', () => {
      connectedCount += 1;
    });
    client.on('gameStateUpdate', (lobby) => {
      states[index].lobby = lobby;
    });
    client.on('privatePlayerUpdate', (me) => {
      states[index].me = me;
    });
    client.on('error', (msg) => {
      console.error('Socket Error:', msg);
    });
  });

  await sleep(2000);
  assert(connectedCount === 8, 'Failed to connect 8 clients. Is the server running?');
  console.log('✅ 8 clients connected.');

  clients[0].emit('createLobby', { displayName: 'Host', sessionId: 'session_0' }, (id) => {
    lobbyId = id;
  });
  await sleep(500);
  assert(lobbyId !== '', 'Failed to create lobby');

  for (let index = 1; index < 8; index += 1) {
    clients[index].emit('joinLobby', { lobbyId, displayName: `Player${index}`, sessionId: `session_${index}` }, () => {});
  }

  await sleep(800);
  assert(states[0].lobby.players.length === 8, 'Not all players joined');
  assert(states[0].lobby.roleConfig.detective === 1, 'Rulebook auto-fill did not apply the 8-player setup');
  assert(states[0].lobby.roleConfig.nurse === 1, 'Expected one specialist in the 8-player setup');
  assert(states[0].lobby.roleConfig.thug === 2, 'Expected two thugs in the 8-player setup');
  console.log('✅ Rulebook setup table applied for 8 players.');

  clients[1].emit('startGame', lobbyId);
  await sleep(400);
  assert(states[0].lobby.gameState.phase === 'lobby', 'Non-host started the game');
  console.log('✅ Non-host start restriction works.');

  clients[0].emit('startGame', lobbyId);
  await sleep(1000);
  assert(states[0].lobby.gameState.phase === 'role_reveal', 'Game failed to enter role reveal');

  clients.forEach((client) => client.emit('continueToNextPhase', lobbyId));
  await sleep(1000);
  assert(states[0].lobby.gameState.phase === 'night', 'Failed to enter the first night');
  assert(states[0].lobby.gameState.firstNight === true, 'Expected first night flag to be set');

  let nurseIndex = -1;
  let detectiveIndex = -1;
  const thugIndices = [];
  const bystanderIndices = [];

  for (let index = 0; index < 8; index += 1) {
    const role = states[index].me.role;
    if (role === 'Nurse') nurseIndex = index;
    if (role === 'Detective') detectiveIndex = index;
    if (role === 'Thug') thugIndices.push(index);
    if (role === 'Bystander') bystanderIndices.push(index);
  }

  assert(nurseIndex !== -1, 'Missing Nurse');
  assert(detectiveIndex !== -1, 'Missing Detective');
  assert(thugIndices.length === 2, 'Expected two Thugs');
  assert(bystanderIndices.length >= 2, 'Expected multiple Bystanders');

  const investigatedThugId = states[thugIndices[0]].me.playerId;
  const protectedBystanderId = states[bystanderIndices[0]].me.playerId;

  clients[nurseIndex].emit('submitNightAction', {
    lobbyId,
    abilityTargetId: protectedBystanderId,
    abilityAction: 'protect',
  });
  clients[detectiveIndex].emit('submitNightAction', {
    lobbyId,
    abilityTargetId: investigatedThugId,
    abilityAction: 'investigate',
  });

  await sleep(1200);
  assert(states[0].lobby.gameState.phase === 'day', 'First night did not resolve to day');
  assert(states[0].lobby.gameState.nightDeaths.length === 0, 'Nobody should die on the first night');
  assert(states[detectiveIndex].me.investigationResult?.targetId === investigatedThugId, 'Detective investigation result missing');
  assert(states[detectiveIndex].me.investigationResult?.role === 'Thug', 'Detective should see the exact investigated role');
  console.log('✅ First-night rule and detective investigation passed.');

  for (let index = 0; index < 8; index += 1) {
    if (states[index].me.isAlive) clients[index].emit('continueToNextPhase', lobbyId);
  }
  await sleep(1000);
  assert(states[0].lobby.gameState.phase === 'voting', 'Failed to enter voting');

  const firstThugId = states[thugIndices[0]].me.playerId;
  for (let index = 0; index < 8; index += 1) {
    if (states[index].me.isAlive) {
      clients[index].emit('submitVote', { lobbyId, targetId: firstThugId });
    }
  }
  await sleep(1000);
  assert(states[0].lobby.gameState.phase === 'result', 'Voting did not resolve');
  assert(states[0].lobby.gameState.lastEliminated === firstThugId, 'Expected the first Thug to be eliminated');

  for (let index = 0; index < 8; index += 1) {
    if (states[index].me.isAlive) clients[index].emit('continueToNextPhase', lobbyId);
  }
  await sleep(1000);
  assert(states[0].lobby.gameState.phase === 'night', 'Failed to loop back to night');
  assert(states[0].lobby.gameState.firstNight === false, 'Only the opening night should be marked as first night');

  const remainingThugIndex = thugIndices.find((index) => states[index].me.isAlive);
  const doomedBystanderId = states[bystanderIndices[1]].me.playerId;

  clients[remainingThugIndex].emit('submitNightAction', {
    lobbyId,
    mafiaTargetId: doomedBystanderId,
  });
  clients[nurseIndex].emit('submitNightAction', {
    lobbyId,
    abilityTargetId: protectedBystanderId,
    abilityAction: 'protect',
  });
  clients[detectiveIndex].emit('submitNightAction', {
    lobbyId,
    abilityTargetId: states[remainingThugIndex].me.playerId,
    abilityAction: 'investigate',
  });

  await sleep(1200);
  assert(states[0].lobby.gameState.phase === 'day', 'Night two did not resolve to day');
  assert(states[0].lobby.gameState.nightDeaths.length === 1, 'Expected exactly one night kill');
  assert(states[0].lobby.gameState.nightDeaths[0] === doomedBystanderId, 'The wrong player died on night two');
  console.log('✅ Night kill flow passed.');

  for (let index = 0; index < 8; index += 1) {
    if (states[index].me.isAlive) clients[index].emit('continueToNextPhase', lobbyId);
  }
  await sleep(1000);

  const lastThugId = states[remainingThugIndex].me.playerId;
  for (let index = 0; index < 8; index += 1) {
    if (states[index].me.isAlive) {
      clients[index].emit('submitVote', { lobbyId, targetId: lastThugId });
    }
  }

  await sleep(1000);
  assert(states[0].lobby.gameState.phase === 'ended', 'Game did not end');
  assert(states[0].lobby.gameState.winner === 'Civilians', 'The civilians should have won');

  console.log('✅ Citizens win condition passed.');
  console.log('\n🧪 Mafia: Vendetta integration test passed. 🧪');
  process.exit(0);
}

runTest().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});

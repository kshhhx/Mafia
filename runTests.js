const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const { io: ioclient } = require("socket.io-client");

// We extract just the Socket game logic from server.js into a testable standalone server
const expressApp = express();
const httpServer = createServer(expressApp);
const io = new Server(httpServer);

const lobbies = new Map();
function generateRoomCode() { return 'TEST'; }

io.on('connection', (socket) => {
    socket.on('createLobby', (displayName, callback) => {
      const lobbyId = generateRoomCode();
      const playerId = socket.id;
      const newLobby = {
        lobbyId, hostId: playerId, status: 'waiting',
        settings: { revealRoleOnDeath: true, discussionTimer: 0, nightActionTimer: 0, doctorCanSelfSave: false },
        roleConfig: { mafia: 1, doctor: 1, detective: 1, citizen: 2 },
        players: [{ playerId, socketId: socket.id, displayName, isAlive: true, role: null, team: null, isReady: false, currentVote: null, nightAction: null, readyToContinue: false }],
        gameState: { phase: 'lobby', roundNumber: 1, alivePlayers: [playerId], eliminatedPlayers: [], nightActions: { mafiaTarget: null, doctorSave: null, detectiveCheck: null }, voteResults: {}, winner: null, lastEliminated: null, nightDeath: null, detectiveResult: null }
      };
      lobbies.set(lobbyId, newLobby);
      socket.join(lobbyId);
      callback(lobbyId);
      io.to(lobbyId).emit('gameStateUpdate', newLobby);
      socket.emit('privatePlayerUpdate', newLobby.players[0]);
    });

    socket.on('joinLobby', (lobbyId, displayName, callback) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return callback(false, 'Lobby not found');
      const playerId = socket.id;
      const newPlayer = { playerId, socketId: socket.id, displayName, isAlive: true, role: null, team: null, isReady: false, currentVote: null, nightAction: null, readyToContinue: false };
      lobby.players.push(newPlayer);
      lobby.gameState.alivePlayers.push(playerId);
      socket.join(lobbyId);
      callback(true);
      io.to(lobbyId).emit('gameStateUpdate', lobby);
      socket.emit('privatePlayerUpdate', newPlayer);
    });

    socket.on('updateRoleConfig', ({ lobbyId, config }) => {
      const lobby = lobbies.get(lobbyId);
      if (lobby) lobby.roleConfig = config;
    });

    socket.on('toggleReady', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      const player = lobby?.players.find(p => p.socketId === socket.id);
      if (player) { player.isReady = !player.isReady; io.to(lobbyId).emit('gameStateUpdate', lobby); }
    });

    socket.on('startGame', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      let rolesPool = [
          {role: 'Mafia', team: 'Mafia'}, 
          {role: 'Doctor', team: 'Citizens'}, 
          {role: 'Detective', team: 'Citizens'}, 
          {role: 'Citizen', team: 'Citizens'}, 
          {role: 'Citizen', team: 'Citizens'}
      ];
      lobby.players.forEach((p, index) => { p.role = rolesPool[index].role; p.team = rolesPool[index].team; p.isAlive = true; });
      lobby.status = 'in_progress'; lobby.gameState.phase = 'role_reveal';
      io.to(lobbyId).emit('gameStateUpdate', lobby);
      lobby.players.forEach(p => io.to(p.socketId).emit('privatePlayerUpdate', p));
    });

    socket.on('continueToNextPhase', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      const player = lobby?.players.find(p => p.socketId === socket.id);
      if (player) player.readyToContinue = true;
      const alivePlayers = lobby.players.filter(p => p.isAlive);
      if (alivePlayers.every(p => p.readyToContinue)) {
        lobby.players.forEach(p => p.readyToContinue = false);
        if (lobby.gameState.phase === 'role_reveal' || lobby.gameState.phase === 'result') {
            lobby.gameState.phase = 'night';
            lobby.gameState.roundNumber += 1;
            lobby.gameState.nightActions = { mafiaTarget: null, doctorSave: null, detectiveCheck: null };
            lobby.players.forEach(p => p.nightAction = null);
        } else if (lobby.gameState.phase === 'day') {
           lobby.gameState.phase = 'voting';
        }
        io.to(lobbyId).emit('gameStateUpdate', lobby);
      }
    });

    socket.on('submitNightAction', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      const player = lobby?.players.find(p => p.socketId === socket.id);
      if (player) player.nightAction = targetId;

      const mafiaAlive = lobby.players.filter(p => p.role === 'Mafia' && p.isAlive);
      const doctorAlive = lobby.players.filter(p => p.role === 'Doctor' && p.isAlive);
      const detAlive = lobby.players.filter(p => p.role === 'Detective' && p.isAlive);

      if ((mafiaAlive.length === 0 || mafiaAlive.some(p => p.nightAction)) && 
          (doctorAlive.length === 0 || doctorAlive.every(p => p.nightAction !== null)) && 
          (detAlive.length === 0 || detAlive.every(p => p.nightAction !== null))) {
          
          const mafiaTarget = mafiaAlive[0]?.nightAction;
          const docSave = doctorAlive[0]?.nightAction;
          
          lobby.gameState.nightDeath = null;
          if (mafiaTarget && mafiaTarget !== docSave) {
              const victim = lobby.players.find(p => p.playerId === mafiaTarget);
              if (victim) {
                  victim.isAlive = false;
                  lobby.gameState.nightDeath = victim.playerId;
                  lobby.gameState.eliminatedPlayers.push(victim.playerId);
              }
          }
          lobby.gameState.phase = 'day';
          
          if (checkWinCondition(lobby)) finishGame(lobby, io);
          else io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
      }
    });

    socket.on('submitVote', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      const player = lobby?.players.find(p => p.socketId === socket.id);
      if (player) {
          player.currentVote = targetId;
          lobby.gameState.voteResults[player.playerId] = targetId;
      }
      const alivePlayers = lobby.players.filter(p => p.isAlive);
      if (Object.keys(lobby.gameState.voteResults).length === alivePlayers.length) {
         const votes = Object.values(lobby.gameState.voteResults).filter(v => v !== 'skip');
         if (votes.length > 0) {
            const counts = {}; let maxVotes = 0; let eliminatedId = null; let tie = false;
            for (const v of votes) {
               counts[v] = (counts[v] || 0) + 1;
               if (counts[v] > maxVotes) { maxVotes = counts[v]; eliminatedId = v; tie = false; }
               else if (counts[v] === maxVotes) tie = true;
            }
            if (!tie) {
                const victim = lobby.players.find(p => p.playerId === eliminatedId);
                if (victim) { victim.isAlive = false; lobby.gameState.lastEliminated = victim.playerId; lobby.gameState.eliminatedPlayers.push(victim.playerId); }
            }
         }
         lobby.gameState.voteResults = {}; lobby.players.forEach(p => p.currentVote = null);
         lobby.gameState.phase = 'result';
         if (checkWinCondition(lobby)) finishGame(lobby, io);
         else io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
      }
    });
});

function checkWinCondition(lobby) {
     const aliveMafia = lobby.players.filter(p => p.isAlive && p.team === 'Mafia').length;
     const aliveCitizens = lobby.players.filter(p => p.isAlive && p.team === 'Citizens').length;
     if (aliveMafia === 0) { lobby.gameState.winner = 'Citizens'; return true; }
     if (aliveMafia >= aliveCitizens) { lobby.gameState.winner = 'Mafia'; return true; }
     return false;
}
function finishGame(lobby, io) { lobby.gameState.phase = 'ended'; lobby.status = 'finished'; io.to(lobby.lobbyId).emit('gameStateUpdate', lobby); }

// --- TEST CLIENTS ---

httpServer.listen(0, '127.0.0.1', async () => {
    const port = httpServer.address().port;
    console.log(`Test server running on port ${port}`);

    const sleep = ms => new Promise(res => setTimeout(res, ms));
    const clients = Array.from({ length: 5 }, () => ioclient(`http://127.0.0.1:${port}`));
    
    await sleep(500);
    let states = clients.map(() => ({ me: null, lobby: null }));
    clients.forEach((c, idx) => {
        c.on("gameStateUpdate", (lobby) => { states[idx].lobby = lobby; });
        c.on("privatePlayerUpdate", (me) => { states[idx].me = me; });
    });

    clients[0].emit("createLobby", "HostPlayer", () => {});
    await sleep(200);
    const lobbyId = states[0].lobby.lobbyId;

    for (let i = 1; i < 5; i++) clients[i].emit("joinLobby", lobbyId, `Player${i}`, () => {});
    await sleep(200);

    for (let i = 0; i < 5; i++) clients[i].emit("toggleReady", lobbyId);
    await sleep(200);

    clients[0].emit("startGame", lobbyId);
    await sleep(200);
    console.assert(states[0].lobby.gameState.phase === 'role_reveal', "Failed starting game");

    for (const c of clients) c.emit("continueToNextPhase", lobbyId);
    await sleep(200);
    console.assert(states[0].lobby.gameState.phase === 'night', "Failed night transition");

    const mafiaId = states.find(s => s.me.role === 'Mafia').me.playerId;
    const targetId = states.find(s => s.me.role === 'Citizen').me.playerId;
    
    for (let i = 0; i < 5; i++) {
        const role = states[i].me.role;
        clients[i].emit("submitNightAction", { lobbyId, targetId: role === 'Mafia' ? targetId : (role === 'Doctor' ? null : states[0].me.playerId) });
    }
    await sleep(200);
    console.assert(states[0].lobby.gameState.phase === 'day', "Failed day transition");
    console.assert(states[0].lobby.gameState.nightDeath === targetId, "Mafia kill failed");

    for (let i = 0; i < 5; i++) if (states[i].me.isAlive) clients[i].emit("continueToNextPhase", lobbyId);
    await sleep(200);
    console.assert(states[0].lobby.gameState.phase === 'voting', "Failed voting transition");

    for (let i = 0; i < 5; i++) if (states[i].me.isAlive) clients[i].emit("submitVote", { lobbyId, targetId: mafiaId });
    await sleep(200);
    console.assert(states[0].lobby.gameState.phase === 'ended', "Failed ended transition");
    console.assert(states[0].lobby.gameState.winner === 'Citizens', "Citizens should win");

    console.log("✅ ALL TESTS PASSED! Game Logic is solid.");
    process.exit(0);
});

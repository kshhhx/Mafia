const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.RENDER ? '0.0.0.0' : 'localhost';
const port = parseInt(process.env.PORT || '3001', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// IN-MEMORY GAME STATE 
const lobbies = new Map(); // Map<string, Lobby>

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

app.prepare().then(() => {
  const expressApp = express();
  const httpServer = createServer(expressApp);
  const io = new Server(httpServer);

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('createLobby', (displayName, callback) => {
      const lobbyId = generateRoomCode();
      const playerId = socket.id; // use socket id as simple player ID for MVP
      const newLobby = {
        lobbyId,
        hostId: playerId,
        status: 'waiting',
        settings: {
          revealRoleOnDeath: true,
          discussionTimer: 0,
          nightActionTimer: 0,
          doctorCanSelfSave: false,
        },
        roleConfig: {
          mafia: 1,
          doctor: 1,
          detective: 1,
          citizen: 2,
        },
        players: [{
          playerId,
          socketId: socket.id,
          displayName,
          isAlive: true,
          role: null,
          team: null,
          isReady: false,
          currentVote: null,
          nightAction: null,
          readyToContinue: false,
        }],
        gameState: {
          phase: 'lobby',
          roundNumber: 1,
          alivePlayers: [playerId],
          eliminatedPlayers: [],
          nightActions: { mafiaTarget: null, doctorSave: null, detectiveCheck: null },
          voteResults: {},
          winner: null,
          lastEliminated: null,
          nightDeath: null,
          detectiveResult: null,
        }
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
      if (lobby.status !== 'waiting') return callback(false, 'Game already in progress');

      const playerId = socket.id;
      const newPlayer = {
        playerId,
        socketId: socket.id,
        displayName,
        isAlive: true,
        role: null,
        team: null,
        isReady: false,
        currentVote: null,
        nightAction: null,
        readyToContinue: false,
      };

      lobby.players.push(newPlayer);
      lobby.gameState.alivePlayers.push(playerId);
      socket.join(lobbyId);
      callback(true);
      
      io.to(lobbyId).emit('gameStateUpdate', lobby);
      socket.emit('privatePlayerUpdate', newPlayer);
    });

    socket.on('updateRoleConfig', ({ lobbyId, config }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.hostId !== socket.id) return;
      lobby.roleConfig = config;
      io.to(lobbyId).emit('gameStateUpdate', lobby);
    });

    socket.on('toggleReady', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (player) {
        player.isReady = !player.isReady;
        io.to(lobbyId).emit('gameStateUpdate', lobby);
      }
    });

    socket.on('startGame', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.hostId !== socket.id) return;

      const totalRolesConfigured = lobby.roleConfig.mafia + lobby.roleConfig.doctor + lobby.roleConfig.detective + lobby.roleConfig.citizen;
      if (totalRolesConfigured !== lobby.players.length) {
        socket.emit('error', 'Role count must match player count');
        return;
      }

      // Assign Roles
      let rolesPool = [];
      for(let i=0; i<lobby.roleConfig.mafia; i++) rolesPool.push({role: 'Mafia', team: 'Mafia'});
      for(let i=0; i<lobby.roleConfig.doctor; i++) rolesPool.push({role: 'Doctor', team: 'Citizens'});
      for(let i=0; i<lobby.roleConfig.detective; i++) rolesPool.push({role: 'Detective', team: 'Citizens'});
      for(let i=0; i<lobby.roleConfig.citizen; i++) rolesPool.push({role: 'Citizen', team: 'Citizens'});

      // Shuffle
      rolesPool = rolesPool.sort(() => Math.random() - 0.5);

      lobby.players.forEach((p, index) => {
        p.role = rolesPool[index].role;
        p.team = rolesPool[index].team;
        p.isAlive = true;
      });

      lobby.status = 'in_progress';
      lobby.gameState.phase = 'role_reveal';
      
      io.to(lobbyId).emit('gameStateUpdate', lobby);
      lobby.players.forEach(p => {
        io.to(p.socketId).emit('privatePlayerUpdate', p);
      });
    });

    socket.on('continueToNextPhase', (lobbyId) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby) return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (player) player.readyToContinue = true;

      // If all ALIVE players are ready, move phase
      const alivePlayers = lobby.players.filter(p => p.isAlive);
      if (alivePlayers.every(p => p.readyToContinue)) {
        // Reset flags
        lobby.players.forEach(p => p.readyToContinue = false);

        if (lobby.gameState.phase === 'role_reveal') {
          startNightPhase(lobby, io);
        } else if (lobby.gameState.phase === 'day') {
           // From day announcements to voting
           lobby.gameState.phase = 'voting';
           io.to(lobbyId).emit('gameStateUpdate', lobby);
        } else if (lobby.gameState.phase === 'result') {
           // Next round (Night again)
           startNightPhase(lobby, io);
        }
      } else {
        io.to(lobbyId).emit('gameStateUpdate', lobby);
      }
    });

    socket.on('submitNightAction', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.gameState.phase !== 'night') return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player || !player.isAlive) return;

      player.nightAction = targetId;

      // Check if all active night roles have submitted
      const mafiaAlive = lobby.players.filter(p => p.role === 'Mafia' && p.isAlive);
      const doctorAlive = lobby.players.filter(p => p.role === 'Doctor' && p.isAlive);
      const detAlive = lobby.players.filter(p => p.role === 'Detective' && p.isAlive);

      const mafiaDone = mafiaAlive.length === 0 || mafiaAlive.some(p => p.nightAction !== null);
      const docDone = doctorAlive.length === 0 || doctorAlive.every(p => p.nightAction !== null);
      const detDone = detAlive.length === 0 || detAlive.every(p => p.nightAction !== null);

      io.to(lobbyId).emit('gameStateUpdate', lobby); // update UI to show "locked"

      if (mafiaDone && docDone && detDone) {
        resolveNightPhase(lobby, io);
      }
    });

    socket.on('submitVote', ({ lobbyId, targetId }) => {
      const lobby = lobbies.get(lobbyId);
      if (!lobby || lobby.gameState.phase !== 'voting') return;
      const player = lobby.players.find(p => p.socketId === socket.id);
      if (!player || !player.isAlive) return;

      player.currentVote = targetId;
      lobby.gameState.voteResults[player.playerId] = targetId;
      io.to(lobbyId).emit('gameStateUpdate', lobby);

      const alivePlayers = lobby.players.filter(p => p.isAlive);
      if (Object.keys(lobby.gameState.voteResults).length === alivePlayers.length) {
        resolveVotingPhase(lobby, io);
      }
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
      // For MVP, if a player disconnects, let's keep them in memory.
      // A robust app would handle reconnects, but we skip it here.
    });
  });

  // GAME ENGINE HELPERS
  function startNightPhase(lobby, io) {
    lobby.gameState.phase = 'night';
    lobby.gameState.roundNumber += 1;
    lobby.gameState.nightActions = { mafiaTarget: null, doctorSave: null, detectiveCheck: null };
    lobby.players.forEach(p => p.nightAction = null);
    io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
  }

  function resolveNightPhase(lobby, io) {
    // 1. Gather actions 
    const mafiaTarget = lobby.players.find(p => p.role === 'Mafia' && p.isAlive && p.nightAction)?.nightAction;
    const docSave = lobby.players.find(p => p.role === 'Doctor' && p.isAlive)?.nightAction;
    const detCheck = lobby.players.find(p => p.role === 'Detective' && p.isAlive)?.nightAction;
    
    // Resolve Detective
    if (detCheck) {
      const targetPlayer = lobby.players.find(p => p.playerId === detCheck);
      const detPlayer = lobby.players.find(p => p.role === 'Detective' && p.isAlive);
      if (detPlayer && targetPlayer) {
        io.to(detPlayer.socketId).emit('privatePlayerData', {
          detResult: { targetId: targetPlayer.playerId, isMafia: targetPlayer.role === 'Mafia'}
        });
        lobby.gameState.detectiveResult = { targetId: targetPlayer.playerId, isMafia: targetPlayer.role === 'Mafia'};
      }
    }

    // Resolve Elimination
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
    
    if (checkWinCondition(lobby)) {
        finishGame(lobby, io);
        return;
    }

    io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
  }

  function resolveVotingPhase(lobby, io) {
     const votes = Object.values(lobby.gameState.voteResults).filter(v => v !== 'skip');
     
     if (votes.length === 0) {
        // No one eliminated
        lobby.gameState.lastEliminated = null;
     } else {
        // Tally
        const counts = {};
        let maxVotes = 0;
        let eliminatedId = null;
        let tie = false;
        
        for (const v of votes) {
           counts[v] = (counts[v] || 0) + 1;
           if (counts[v] > maxVotes) {
               maxVotes = counts[v];
               eliminatedId = v;
               tie = false;
           } else if (counts[v] === maxVotes) {
               tie = true;
           }
        }

        if (tie) {
            lobby.gameState.lastEliminated = null; // tie = no elimination MVP
        } else {
            const victim = lobby.players.find(p => p.playerId === eliminatedId);
            if (victim) {
                victim.isAlive = false;
                lobby.gameState.lastEliminated = victim.playerId;
                lobby.gameState.eliminatedPlayers.push(victim.playerId);
            }
        }
     }

     lobby.gameState.voteResults = {};
     lobby.players.forEach(p => p.currentVote = null);
     lobby.gameState.phase = 'result';

     if (checkWinCondition(lobby)) {
         finishGame(lobby, io);
         return;
     }

     io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
  }

  function checkWinCondition(lobby) {
     const aliveMafia = lobby.players.filter(p => p.isAlive && p.team === 'Mafia').length;
     const aliveCitizens = lobby.players.filter(p => p.isAlive && p.team === 'Citizens').length;

     if (aliveMafia === 0) {
        lobby.gameState.winner = 'Citizens';
        return true;
     }
     if (aliveMafia >= aliveCitizens) {
        lobby.gameState.winner = 'Mafia';
        return true;
     }
     return false;
  }

  function finishGame(lobby, io) {
     lobby.gameState.phase = 'ended';
     lobby.status = 'finished';
     io.to(lobby.lobbyId).emit('gameStateUpdate', lobby);
  }

  expressApp.all('*', (req, res) => {
    return handle(req, res);
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});

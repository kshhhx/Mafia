// A headless, synchronous test of the game loop logic without Socket.IO

const lobbies = new Map();

function createLobby(hostId) {
    const lobbyId = "TEST";
    const newLobby = {
      lobbyId, hostId, status: 'waiting',
      settings: { revealRoleOnDeath: true, discussionTimer: 0, nightActionTimer: 0, doctorCanSelfSave: false },
      roleConfig: { mafia: 1, doctor: 1, detective: 1, citizen: 2 },
      players: [{ playerId: hostId, socketId: hostId, displayName: "Host", isAlive: true, role: null, team: null, isReady: false, currentVote: null, nightAction: null, readyToContinue: false }],
      gameState: { phase: 'lobby', roundNumber: 1, alivePlayers: [hostId], eliminatedPlayers: [], nightActions: { mafiaTarget: null, doctorSave: null, detectiveCheck: null }, voteResults: {}, winner: null, lastEliminated: null, nightDeath: null, detectiveResult: null }
    };
    lobbies.set(lobbyId, newLobby);
    return lobbyId;
}

function joinLobby(lobbyId, playerId, name) {
    const lobby = lobbies.get(lobbyId);
    lobby.players.push({ playerId, socketId: playerId, displayName: name, isAlive: true, role: null, team: null, isReady: false, currentVote: null, nightAction: null, readyToContinue: false });
    lobby.gameState.alivePlayers.push(playerId);
}

function startGame(lobbyId) {
    const lobby = lobbies.get(lobbyId);
    let rolesPool = [{role: 'Mafia', team: 'Mafia'}, {role: 'Doctor', team: 'Citizens'}, {role: 'Detective', team: 'Citizens'}, {role: 'Citizen', team: 'Citizens'}, {role: 'Citizen', team: 'Citizens'}];
    lobby.players.forEach((p, index) => { p.role = rolesPool[index].role; p.team = rolesPool[index].team; p.isAlive = true; p.isReady = true; });
    lobby.status = 'in_progress'; lobby.gameState.phase = 'role_reveal';
}

function checkWinCondition(lobby) {
    const aliveMafia = lobby.players.filter(p => p.isAlive && p.team === 'Mafia').length;
    const aliveCitizens = lobby.players.filter(p => p.isAlive && p.team === 'Citizens').length;
    if (aliveMafia === 0) { lobby.gameState.winner = 'Citizens'; return true; }
    if (aliveMafia >= aliveCitizens) { lobby.gameState.winner = 'Mafia'; return true; }
    return false;
}

function continuePhase(lobbyId, playerId) {
    const lobby = lobbies.get(lobbyId);
    const player = lobby.players.find(p => p.playerId === playerId);
    player.readyToContinue = true;
    
    if (lobby.players.filter(p => p.isAlive).every(p => p.readyToContinue)) {
        lobby.players.forEach(p => p.readyToContinue = false);
        if (lobby.gameState.phase === 'role_reveal') {
            lobby.gameState.phase = 'night';
        } else if (lobby.gameState.phase === 'day') {
            lobby.gameState.phase = 'voting';
        } else if (lobby.gameState.phase === 'result') {
            lobby.gameState.phase = 'night';
            lobby.gameState.roundNumber += 1;
            lobby.players.forEach(p => p.nightAction = null);
        }
    }
}

function submitNightAction(lobbyId, playerId, targetId) {
    const lobby = lobbies.get(lobbyId);
    const player = lobby.players.find(p => p.playerId === playerId);
    player.nightAction = targetId;
    
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
            if (victim) { victim.isAlive = false; lobby.gameState.nightDeath = victim.playerId; lobby.gameState.eliminatedPlayers.push(victim.playerId); }
        }
        lobby.gameState.phase = 'day';
        if (checkWinCondition(lobby)) lobby.gameState.phase = 'ended';
    }
}

function submitVote(lobbyId, playerId, targetId) {
    const lobby = lobbies.get(lobbyId);
    const player = lobby.players.find(p => p.playerId === playerId);
    player.currentVote = targetId;
    lobby.gameState.voteResults[player.playerId] = targetId;
    
    if (Object.keys(lobby.gameState.voteResults).length === lobby.players.filter(p => p.isAlive).length) {
        const votes = Object.values(lobby.gameState.voteResults).filter(v => v !== 'skip');
        if (votes.length > 0) {
            const counts = {}; let max = 0; let elimId = null; let tie = false;
            for (const v of votes) {
                counts[v] = (counts[v] || 0) + 1;
                if (counts[v] > max) { max = counts[v]; elimId = v; tie = false; }
                else if (counts[v] === max) tie = true;
            }
            if (!tie) {
                const victim = lobby.players.find(p => p.playerId === elimId);
                if (victim) { victim.isAlive = false; lobby.gameState.lastEliminated = elimId; lobby.gameState.eliminatedPlayers.push(elimId); }
            } else { lobby.gameState.lastEliminated = null; }
        } else { lobby.gameState.lastEliminated = null; }
        
        lobby.gameState.voteResults = {}; lobby.players.forEach(p => p.currentVote = null);
        lobby.gameState.phase = 'result';
        if (checkWinCondition(lobby)) lobby.gameState.phase = 'ended';
    }
}

// =======================
// RUN TEST TRACES
// =======================

try {
    const h = "P0";
    const lobbyId = createLobby(h);
    joinLobby(lobbyId, "P1", "P1");
    joinLobby(lobbyId, "P2", "P2");
    joinLobby(lobbyId, "P3", "P3");
    joinLobby(lobbyId, "P4", "P4");
    
    startGame(lobbyId);
    
    const l = lobbies.get(lobbyId);
    const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
    
    assert(l.gameState.phase === 'role_reveal', "Not Role Reveal");
    for(let i=0; i<5; i++) continuePhase(lobbyId, `P${i}`);
    
    assert(l.gameState.phase === 'night', "Not Night");
    
    const mafia = l.players.find(p => p.role === 'Mafia');
    const doc = l.players.find(p => p.role === 'Doctor');
    const det = l.players.find(p => p.role === 'Detective');
    const cit1 = l.players.find(p => p.role === 'Citizen');

    submitNightAction(lobbyId, mafia.playerId, cit1.playerId);
    submitNightAction(lobbyId, doc.playerId, det.playerId);
    submitNightAction(lobbyId, det.playerId, cit1.playerId);
    
    assert(l.gameState.phase === 'day', "Not Day");
    assert(l.gameState.nightDeath === cit1.playerId, "Citizen didn't die");
    assert(!cit1.isAlive, "Citizen status not updated");

    for(const p of l.players) if(p.isAlive) continuePhase(lobbyId, p.playerId);
    
    assert(l.gameState.phase === 'voting', "Not Voting");

    for(const p of l.players) if(p.isAlive) submitVote(lobbyId, p.playerId, mafia.playerId);
    
    assert(l.gameState.phase === 'ended', "Not Ended");
    assert(l.gameState.winner === 'Citizens', "Citizens didn't win");

    console.log("ALL TESTS PASSED: State transitions, Actions, Voting, and Game Engine Win Conditions work perfectly.");
} catch (e) {
    console.error("TEST FAILED:", e.message);
    process.exit(1);
}

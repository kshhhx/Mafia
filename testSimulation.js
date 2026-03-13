const { io } = require("socket.io-client");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function assert(condition, message) {
    if (!condition) {
        throw new Error("Assertion failed: " + message);
    }
}

async function runTest() {
    console.log("Starting Mafia Server Test with 6 simulated players...");
    
    // Connect 6 clients
    let clients = Array.from({ length: 6 }, () => io("http://127.0.0.1:3001"));
    let connectedCount = 0;
    
    for (const client of clients) {
        client.on("connect", () => connectedCount++);
        client.on("error", (msg) => console.error("Socket Error:", msg));
    }

    await sleep(2000);
    assert(connectedCount === 6, "Failed to connect 6 clients. Is the server running?");
    console.log("✅ 6 Clients Connected.");

    // Store game states
    let lobbyId = "";
    let states = clients.map(() => ({ me: null, lobby: null }));

    const attachListeners = (client, idx) => {
        client.on("gameStateUpdate", (lobby) => { states[idx].lobby = lobby; });
        client.on("privatePlayerUpdate", (me) => { states[idx].me = me; });
    };
    clients.forEach(attachListeners);

    // Client 0 creates lobby
    console.log("Host creating lobby...");
    clients[0].emit("createLobby", { displayName: "HostPlayer", sessionId: "session_0" }, (id) => {
        lobbyId = id;
    });

    await sleep(500);
    assert(lobbyId !== "", "Failed to create lobby.");
    console.log(`✅ Lobby Created: ${lobbyId}`);

    // Clients 1-5 join
    console.log("Other 5 players joining...");
    for (let i = 1; i < 6; i++) {
        clients[i].emit("joinLobby", { lobbyId, displayName: `Player${i}`, sessionId: `session_${i}` }, () => {});
    }

    await sleep(500);
    assert(states[0].lobby.players.length === 6, "Not all players joined");

    // TEST: non-host cannot start game
    console.log("Testing non-host auth restrictions...");
    clients[1].emit("startGame", lobbyId);
    await sleep(500);
    assert(states[0].lobby.gameState.phase === 'lobby', "Non-host was able to start the game!");
    console.log("✅ Non-host gracefully rejected from starting game.");

    // Setup roles for 6 players: 2 Mafia, 1 Doc, 1 Det, 2 Citizens
    console.log("Setting up role config: 2 Mafia...");
    clients[0].emit("updateRoleConfig", { lobbyId, config: { mafia: 2, doctor: 1, detective: 1, citizen: 2 }});
    await sleep(500);
    
    for (let i = 0; i < 6; i++) clients[i].emit("toggleReady", lobbyId);
    await sleep(500);
    
    // Host starts game
    clients[0].emit("startGame", lobbyId);
    await sleep(1000);
    assert(states[0].lobby.gameState.phase === 'role_reveal', "Game failed to start");
    console.log("✅ Game Started. Phase: role_reveal");
    
    // Role Reveal -> Night
    for (const client of clients) client.emit("continueToNextPhase", lobbyId);
    await sleep(1000);
    assert(states[0].lobby.gameState.phase === 'night', "Failed to transition to night");

    // Night Actions
    console.log("Submitting Night Actions (Testing 2-Mafia Aggregation)...");
    
    let mafiaIndices = [];
    let docIndex, detIndex;
    let citizenIndices = [];
    for (let i=0; i<6; i++) {
        const r = states[i].me.role;
        if(r === 'Mafia') mafiaIndices.push(i);
        if(r === 'Doctor') docIndex = i;
        if(r === 'Detective') detIndex = i;
        if(r === 'Citizen') citizenIndices.push(i);
    }
    
    const targetCitizen = citizenIndices[0];

    // Mafia 1 votes for targetCitizen
    clients[mafiaIndices[0]].emit("submitNightAction", { lobbyId, targetId: states[targetCitizen].me.playerId });
    await sleep(500);
    assert(states[0].lobby.gameState.phase === 'night', "Night resolved too early before all Mafia voted!");
    console.log("✅ Night held open, waiting for second Mafia...");

    // Mafia 2 votes for targetCitizen
    clients[mafiaIndices[1]].emit("submitNightAction", { lobbyId, targetId: states[targetCitizen].me.playerId });
    
    // Doctor saves self (to let the citizen die)
    clients[docIndex].emit("submitNightAction", { lobbyId, targetId: states[docIndex].me.playerId });
    
    // Det checks Citizen 1
    clients[detIndex].emit("submitNightAction", { lobbyId, targetId: states[citizenIndices[1]].me.playerId });

    await sleep(1000);
    assert(states[0].lobby.gameState.phase === 'day', "Failed to resolve night");
    console.log("✅ 2 Mafia Aggregation Successful. Phase: Day.");
    assert(states[0].lobby.gameState.nightDeath === states[targetCitizen].me.playerId, "Wrong person died!");

    // Check Detective private result
    console.log("Checking Detective Privacy...");
    const detMe = states[detIndex].me;
    assert(detMe.detectiveResult !== undefined, "Detective did not get result");
    assert(detMe.detectiveResult.isMafia === false, "Detective got wrong result");
    assert(states[citizenIndices[1]].me.detectiveResult === undefined, "Detective result leaked to another player!");
    console.log("✅ Detective private event properly isolated.");

    // RECONNECT TEST
    console.log("Testing Reconnect Logic...");
    clients[docIndex].disconnect();
    await sleep(500);
    clients[docIndex] = io("http://127.0.0.1:3001");
    // re-attach listener
    states[docIndex].me = null;
    states[docIndex].lobby = null;
    attachListeners(clients[docIndex], docIndex);
    
    await sleep(500);
    clients[docIndex].emit("reconnectLobby", { lobbyId, sessionId: `session_${docIndex}` });
    await sleep(1000);
    assert(states[docIndex].me !== null, "Reconnect failed to restore private player state");
    assert(states[docIndex].me.role === 'Doctor', "Reconnect failed to restore exact role");
    console.log("✅ Session Reconnect successfully restored player.");

    // Day -> Voting
    for (let i = 0; i < 6; i++) {
        if (states[i].me.isAlive) clients[i].emit("continueToNextPhase", lobbyId);
    }
    await sleep(1000);
    assert(states[0].lobby.gameState.phase === 'voting', "Failed to transition to voting phase.");

    // Voting out a Mafia member
    console.log("Voting out a Mafia member...");
    const mafiaToVoteOut = states[mafiaIndices[0]].me.playerId;
    for (let i = 0; i < 6; i++) {
        if (states[i].me && states[i].me.isAlive) {
            clients[i].emit("submitVote", { lobbyId, targetId: mafiaToVoteOut });
        }
    }
    await sleep(1000);
    
    // It should be result phase
    assert(states[0].lobby.gameState.phase === 'result', "Failed to resolve voting.");
    
    // Result -> Night
    for (let i = 0; i < 6; i++) {
        if (states[i].me && states[i].me.isAlive) clients[i].emit("continueToNextPhase", lobbyId);
    }
    await sleep(1000);
    assert(states[0].lobby.gameState.phase === 'night', "Failed to loop back to night.");

    // Second Night - Mafia kills second citizen, Det checks remaining Mafia, Doc saves himself
    clients[mafiaIndices[1]].emit("submitNightAction", { lobbyId, targetId: states[citizenIndices[1]].me.playerId });
    clients[docIndex].emit("submitNightAction", { lobbyId, targetId: states[docIndex].me.playerId });
    clients[detIndex].emit("submitNightAction", { lobbyId, targetId: states[mafiaIndices[1]].me.playerId });
    
    await sleep(1000);
    assert(states[0].lobby.gameState.phase === 'day', "Night 2 didn't resolve to day.");

    // Check det result of Night 2 is properly cleared and updated
    assert(states[detIndex].me.detectiveResult.isMafia === true, "Detective night 2 failed");

    // Skip Day -> Voting
    for (let i = 0; i < 6; i++) {
        if (states[i].me && states[i].me.isAlive) clients[i].emit("continueToNextPhase", lobbyId);
    }
    await sleep(1000);

    // Vote out last mafia
    console.log("Voting out the final Mafia member to trigger win condition...");
    const lastMafia = states[mafiaIndices[1]].me.playerId;
    for (let i = 0; i < 6; i++) {
        if (states[i].me && states[i].me.isAlive) {
            clients[i].emit("submitVote", { lobbyId, targetId: lastMafia });
        }
    }
    await sleep(1000);

    assert(states[0].lobby.gameState.phase === 'ended', "Game did not end!");
    assert(states[0].lobby.gameState.winner === 'Citizens', "Winner was calculated wrong!");
    
    console.log("✅ Game Ended automatically. Win Condition Successfully Triggered.");
    console.log("\n🧪 ALL MULTIPLAYER & EDGE CASE TESTS PASSED SUCCESSFULLY! 🧪");
    process.exit(0);
}

runTest().catch(err => {
    console.error("Test Failed with Error:", err);
    process.exit(1);
});

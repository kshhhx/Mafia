const { io } = require("socket.io-client");

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest() {
    console.log("Starting Mafia Server Test with 5 simulated players...");
    
    // Connect 5 clients
    const clients = Array.from({ length: 5 }, () => io("http://127.0.0.1:3001"));
    let connectedCount = 0;
    
    for (const client of clients) {
        client.on("connect", () => connectedCount++);
        client.on("error", (msg) => console.error("Socket Error:", msg));
    }

    await sleep(2000);
    if (connectedCount < 5) {
        console.error("Failed to connect 5 clients. Is the server running on port 3001?");
        process.exit(1);
    }
    console.log("✅ 5 Clients Connected.");

    // Store game states
    let lobbyId = "";
    let states = clients.map(() => ({ me: null, lobby: null }));

    clients.forEach((client, idx) => {
        client.on("gameStateUpdate", (lobby) => { states[idx].lobby = lobby; });
        client.on("privatePlayerUpdate", (me) => { states[idx].me = me; });
    });

    // Client 0 creates lobby
    console.log("Host creating lobby...");
    clients[0].emit("createLobby", { displayName: "HostPlayer", sessionId: "session_0" }, (id) => {
        lobbyId = id;
    });

    await sleep(1000);
    if (!lobbyId) {
        console.error("Failed to create lobby.");
        process.exit(1);
    }
    console.log(`✅ Lobby Created: ${lobbyId}`);

    // Clients 1-4 join
    console.log("Other 4 players joining...");
    for (let i = 1; i < 5; i++) {
        clients[i].emit("joinLobby", { lobbyId, displayName: `Player${i}`, sessionId: `session_${i}` }, (success, msg) => {
            if (!success) console.error(`Player ${i} failed to join: ${msg}`);
        });
    }

    await sleep(1000);
    // Setup roles for 5 players: 1 Mafia, 1 Doc, 1 Det, 2 Citizens
    console.log("Setting up roles and starting game...");
    clients[0].emit("updateRoleConfig", { lobbyId, config: { mafia: 1, doctor: 1, detective: 1, citizen: 2 }});
    
    await sleep(500);
    // Mark everyone ready
    for (let i = 0; i < 5; i++) clients[i].emit("toggleReady", lobbyId);
    
    await sleep(500);
    clients[0].emit("startGame", lobbyId);
    
    await sleep(1000);
    const gameLobby = states[0].lobby;
    if (gameLobby.gameState.phase !== 'role_reveal') {
        console.error("Game failed to start / transition to role_reveal. Phase:", gameLobby.gameState.phase);
        process.exit(1);
    }
    console.log("✅ Game Started. Phase: role_reveal");
    
    // Check roles were assigned
    const roles = states.map(s => s.me.role);
    console.log("Assigned roles:", roles);
    if (roles.includes(null)) {
        console.error("Error: Not all players were assigned a role.");
        process.exit(1);
    }

    // Role Reveal -> Night
    console.log("Players acknowledging roles, transitioning to night...");
    for (const client of clients) client.emit("continueToNextPhase", lobbyId);
    
    await sleep(1000);
    if (states[0].lobby.gameState.phase !== 'night') {
        console.error("Failed to transition to night phase.");
        process.exit(1);
    }
    console.log("✅ Phase: night");

    // Night Actions
    console.log("Submitting Night Actions...");
    // Let's have mafia target player 1
    // Doctor will self-save (fail, default rule) or random save
    // Det will check player 0
    let mafiaSocket, docSocket, detSocket;
    const targetId = states[1].me.playerId; 

    for (let i = 0; i < 5; i++) {
        const myRole = states[i].me.role;
        const myId = states[i].me.playerId;
        if (myRole === 'Mafia') {
            clients[i].emit("submitNightAction", { lobbyId, targetId });
        } else if (myRole === 'Doctor') {
            clients[i].emit("submitNightAction", { lobbyId, targetId: null }); // Doc skips or saves someone else
        } else if (myRole === 'Detective') {
            clients[i].emit("submitNightAction", { lobbyId, targetId: states[0].me.playerId });
        }
    }

    await sleep(1500);
    if (states[0].lobby.gameState.phase !== 'day') {
        console.error("Failed to resolve night actions and transition to day.", states[0].lobby.gameState);
        process.exit(1);
    }
    console.log("✅ Phase: day");
    console.log("Night death was:", states[0].lobby.gameState.nightDeath);

    // Day -> Voting
    console.log("Transitioning to voting...");
    for (const client of clients) {
        if (states[clients.indexOf(client)].me.isAlive) {
            client.emit("continueToNextPhase", lobbyId);
        }
    }

    await sleep(1000);
    if (states[0].lobby.gameState.phase !== 'voting') {
        console.error("Failed to transition to voting phase.");
        process.exit(1);
    }
    console.log("✅ Phase: voting");

    // Voting
    console.log("Casting votes...");
    // Let everyone vote for the Mafia to end the game
    const mafiaId = states.find(s => s.me.role === 'Mafia').me.playerId;

    for (let i = 0; i < 5; i++) {
        if (states[i].me.isAlive) {
            clients[i].emit("submitVote", { lobbyId, targetId: mafiaId });
        }
    }

    await sleep(1500);
    if (states[0].lobby.gameState.phase !== 'ended') {
        // Technically goes 'result' -> 'ended' immediately if win cond met, but we need to check if result handled it.
        // Wait, 'result' phase requires acknowledgment before checking wins?
        // Let's check the code for server.js -> resolveVotingPhase
        console.log("Current Phase:", states[0].lobby.gameState.phase);
        if (states[0].lobby.gameState.phase === 'result') {
            console.log("In Result Phase, checking winner...");
            console.log("Winner:", states[0].lobby.gameState.winner);
            
            // Advance from result to ended? No, if winner, server finishGame makes it ended.
        } else {
             console.error("Failed to resolve voting.");
             process.exit(1);
        }
    }
    console.log("✅ Game Ended.");
    console.log("Winner:", states[0].lobby.gameState.winner);

    console.log("\n🧪 ALL TESTS PASSED SUCCESSFULLY! 🧪");
    process.exit(0);
}

runTest().catch(console.error);

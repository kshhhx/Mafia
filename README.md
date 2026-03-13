# Mafia Web App

A clean, mobile-first, real-time web application acting as an automated "God"/moderator for playing the party game Mafia with friends in person.

## Overview
This app removes the need for a human moderator. The game handles role assignment, secretive actions, voting resolution, and game phase transitions to let an entire group play the game directly from their phones.

## Technology Architecture
- **Frontend Framework**: Next.js (React)
- **Styling**: Tailwind CSS (Dark aesthetic, mobile-first)
- **Backend Sync**: Node.js + Express + Socket.IO (Custom script: `server.js`)
- **State Management**: In-memory `Map` of Lobbies acting as a single source of truth.

## Application Flow
1. **Lobby Phase**: Players join via link or 4-letter code. Host configures role balances.
2. **Role Reveal Phase**: Cinematic card flip. Secret team and win-conditions displayed securely.
3. **Night Phase**: Special roles (Mafia, Doctor, Detective) select targets in parallel.
4. **Day Phase**: App announces deaths (or if the Doctor had a successful save). Detective is privately told the results.
5. **Voting Phase**: The town discusses and locks their choices to eliminate a suspect.
6. **End Game Phase**: Win condition evaluates, displays round numbers and roles, allows playing again.

## Setup & Local Development

### Prerequisites
- Node.js (v18+)
- npm or yarn

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local server (Next.js & Socket.IO locally):
   ```bash
   npm run dev
   ```
   *Note: This runs `server.js` using `node` or `tsx` depending on your environment setups. It binds to `localhost` locally and `0.0.0.0` when deployed.*

### Testing
To run the automated socket simulation test:
```bash
npm run test
```

## Resilience Details
If a player accidentally refreshes or locks their phone screen, the client will immediately fetch their `mafia_sessionId` from `localStorage` and ask the socket server to rehydrate the state, letting them resume the game seamlessly without disrupting their role.

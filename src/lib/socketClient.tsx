'use client';

import { io, Socket } from 'socket.io-client';
import { createContext, useContext, useEffect, useState } from 'react';
import type { Lobby, Player } from './types';

interface SocketContextProps {
  socket: Socket | null;
  lobby: Lobby | null;
  me: Player | null;
  error: string | null;
}

const SocketContext = createContext<SocketContextProps>({
  socket: null,
  lobby: null,
  me: null,
  error: null,
});

export const useGame = () => useContext(SocketContext);

let socketInstance: Socket | null = null;

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobby, setLobby] = useState<Lobby | null>(null);
  const [me, setMe] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let storedSessionId = typeof window !== 'undefined' ? localStorage.getItem('mafia_sessionId') : null;
    if (!storedSessionId && typeof window !== 'undefined') {
       storedSessionId = Math.random().toString(36).substring(2, 12);
       localStorage.setItem('mafia_sessionId', storedSessionId);
    }

    if (!socketInstance) {
      socketInstance = io();
    }

    setSocket(socketInstance);

    const handleConnect = () => {
      const pathname = window.location.pathname;
      if (pathname.length > 1 && storedSessionId) {
        const lobbyIdFromUrl = pathname.substring(1).toUpperCase();
        socketInstance?.emit('reconnectLobby', { lobbyId: lobbyIdFromUrl, sessionId: storedSessionId });
      }
    };

    const handleGameStateUpdate = (updatedLobby: Lobby) => {
      setLobby(updatedLobby);
    };

    const handlePrivatePlayerUpdate = (updatedPlayer: Player) => {
      setMe(updatedPlayer);
    };

    const handleError = (msg: string) => {
      setError(msg);
      setTimeout(() => setError(null), 3000);
    };

    socketInstance.on('connect', handleConnect);
    socketInstance.on('gameStateUpdate', handleGameStateUpdate);
    socketInstance.on('privatePlayerUpdate', handlePrivatePlayerUpdate);
    socketInstance.on('error', handleError);

    return () => {
      socketInstance?.off('connect', handleConnect);
      socketInstance?.off('gameStateUpdate', handleGameStateUpdate);
      socketInstance?.off('privatePlayerUpdate', handlePrivatePlayerUpdate);
      socketInstance?.off('error', handleError);
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, lobby, me, error }}>
      {children}
    </SocketContext.Provider>
  );
};

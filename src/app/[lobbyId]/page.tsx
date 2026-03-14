'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/socketClient';

import LobbyView from '@/components/LobbyView';
import RoleRevealView from '@/components/RoleRevealView';
import NightPhaseView from '@/components/NightPhaseView';
import DayPhaseView from '@/components/DayPhaseView';
import VotingPhaseView from '@/components/VotingPhaseView';
import ResultView from '@/components/ResultView';
import EndGameView from '@/components/EndGameView';
import HelpPanel from '@/components/HelpPanel';
import HostAssistantPanel from '@/components/HostAssistantPanel';

export default function GameRoom({ params }: { params: { lobbyId: string } }) {
  const router = useRouter();
  const { lobby, me } = useGame();
  const [connecting, setConnecting] = useState(true);

  useEffect(() => {
    // Give the socket 2 seconds to seamlessly reconnect
    const timeout = setTimeout(() => {
       if (!lobby || !me) {
          router.push(`/?lobby=${params.lobbyId}`);
       }
    }, 2000);
    
    if (lobby && me) {
       setConnecting(false);
       clearTimeout(timeout);
    }
    
    return () => clearTimeout(timeout);
  }, [lobby, me, router, params.lobbyId]);

  if (connecting || !lobby || !me) {
     return (
       <div className="min-h-screen flex flex-col items-center justify-center bg-black fade-in text-white">
          <div className="w-12 h-12 border-4 border-gray-700 border-t-mafiaRed rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-medium tracking-widest uppercase">Connecting to Room...</p>
       </div>
     );
  }

  const phase = lobby.gameState.phase;
  const isModeratorHost = lobby.hostId === me.playerId;

  return (
    <div className="min-h-screen bg-darkerBg text-white pb-safe">
      <HelpPanel lobby={lobby} />
      {phase === 'lobby' && <LobbyView />}
      {phase !== 'lobby' && phase !== 'ended' && isModeratorHost ? (
        <HostAssistantPanel />
      ) : (
        <>
          {phase === 'role_reveal' && <RoleRevealView />}
          {phase === 'night' && <NightPhaseView />}
          {phase === 'day' && <DayPhaseView />}
          {phase === 'voting' && <VotingPhaseView />}
          {phase === 'result' && <ResultView />}
          {phase === 'ended' && <EndGameView />}
        </>
      )}
    </div>
  );
}

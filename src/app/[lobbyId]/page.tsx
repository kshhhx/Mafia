'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useGame } from '@/lib/socketClient';

import LobbyView from '@/components/LobbyView';
import RoleRevealView from '@/components/RoleRevealView';
import NightPhaseView from '@/components/NightPhaseView';
import DayPhaseView from '@/components/DayPhaseView';
import VotingPhaseView from '@/components/VotingPhaseView';
import ResultView from '@/components/ResultView';
import EndGameView from '@/components/EndGameView';

export default function GameRoom({ params }: { params: { lobbyId: string } }) {
  const router = useRouter();
  const { lobby, me } = useGame();

  useEffect(() => {
    if (!lobby || !me) {
      // If refreshed or no lobby in memory, go home
      router.push('/');
    }
  }, [lobby, me, router]);

  if (!lobby || !me) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const phase = lobby.gameState.phase;

  return (
    <div className="min-h-screen bg-darkerBg text-white pb-safe">
      {phase === 'lobby' && <LobbyView />}
      {phase === 'role_reveal' && <RoleRevealView />}
      {phase === 'night' && <NightPhaseView />}
      {phase === 'day' && <DayPhaseView />}
      {phase === 'voting' && <VotingPhaseView />}
      {phase === 'result' && <ResultView />}
      {phase === 'ended' && <EndGameView />}
    </div>
  );
}

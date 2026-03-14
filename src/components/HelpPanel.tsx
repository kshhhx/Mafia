'use client';

import { useMemo, useState } from 'react';
import { GAME_HELP, ROLE_BRIEFS } from '@/lib/rules';
import type { Lobby, Role } from '@/lib/types';

export default function HelpPanel({ lobby }: { lobby: Lobby | null }) {
  const [open, setOpen] = useState(false);

  const visibleRoles = useMemo(() => {
    if (!lobby) return [] as Role[];
    return Object.entries(lobby.roleConfig)
      .filter(([, count]) => count > 0)
      .map(([key]) => {
        const map: Record<string, Role> = {
          bystander: 'Bystander',
          nurse: 'Nurse',
          bodyguard: 'Bodyguard',
          vixen: 'Vixen',
          hypnotist: 'Hypnotist',
          journalist: 'Journalist',
          detective: 'Detective',
          jailer: 'Jailer',
          priest: 'Priest',
          judge: 'Judge',
          sheriff: 'Sheriff',
          thug: 'Thug',
          thief: 'Thief',
          lawyer: 'Lawyer',
          godfather: 'Godfather',
          snitch: 'Snitch',
          yakuza: 'Yakuza',
          femmeFatale: 'FemmeFatale',
          impostor: 'Impostor',
          psycho: 'Psycho',
        };
        return map[key];
      });
  }, [lobby]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 right-4 z-40 h-11 w-11 rounded-full bg-white text-black font-black shadow-lg hover:bg-gray-200 transition-colors"
        aria-label="Open game help"
      >
        i
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm p-4">
          <div className="mx-auto mt-10 max-w-lg rounded-3xl border border-gray-700 bg-darkerBg text-white shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-darkerBg/95 backdrop-blur border-b border-gray-800 px-5 py-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Game Help</h2>
                <p className="text-sm text-gray-400">Quick guide for new players</p>
              </div>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full bg-gray-800 px-3 py-1 text-sm hover:bg-gray-700">
                Close
              </button>
            </div>

            <div className="p-5 space-y-6">
              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Overview</h3>
                <p className="text-sm leading-6 text-gray-200">{GAME_HELP.overview}</p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Using The App</h3>
                <p className="text-sm leading-6 text-gray-200">{GAME_HELP.interface}</p>
              </section>

              <section>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Game Flow</h3>
                <div className="space-y-2">
                  {GAME_HELP.flow.map((item) => (
                    <p key={item} className="text-sm leading-6 text-gray-200">
                      {item}
                    </p>
                  ))}
                </div>
              </section>

              {visibleRoles.length > 0 && (
                <section>
                  <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-2">Roles In This Lobby</h3>
                  <div className="space-y-3">
                    {visibleRoles.map((role) => (
                      <div key={role} className="rounded-2xl border border-gray-800 bg-black/20 p-3">
                        <div className="font-bold">{role}</div>
                        <p className="text-sm text-gray-300 mt-1">{ROLE_BRIEFS[role].summary}</p>
                        <p className="text-sm text-gray-400 mt-1">{ROLE_BRIEFS[role].ability}</p>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

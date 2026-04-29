"use client";

import { useState, useRef, useEffect } from "react";
import PlayerSeat, { type SeatPlayer } from "./PlayerSeat";
import PlayerInfoSheet from "./PlayerInfoSheet";
import EliminationDoor from "./EliminationDoor";

interface RoundTableProps {
  players: SeatPlayer[];
  currentUserId: string;
  activeTurnPlayerId: string | null;
  recentlyEliminatedName: string | null;
}

export default function RoundTable({
  players,
  currentUserId,
  activeTurnPlayerId,
  recentlyEliminatedName,
}: RoundTableProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<SeatPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [tableRadius, setTableRadius] = useState(200);

  useEffect(() => {
    const update = () => {
      if (!containerRef.current) return;
      const { width, height } = containerRef.current.getBoundingClientRect();
      const shorter = Math.min(width, height);
      setTableRadius(Math.max(140, Math.min(320, shorter * 0.42)));
    };
    update();
    const ro = new ResizeObserver(update);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Keep sheet data fresh — derive the latest snapshot on each render (no effect needed)
  const selectedPlayerLive = selectedPlayer
    ? (players.find((p) => p.id === selectedPlayer.id) ?? selectedPlayer)
    : null;

  return (
    <div className="relative w-full h-full">
      <div
        ref={containerRef}
        className="absolute inset-0 flex items-center justify-center"
      >
        {/* Table surface */}
        <div
          className="absolute rounded-[50%] border border-border/30"
          style={{
            width: tableRadius * 1.6,
            height: tableRadius * 1.1,
            background:
              "radial-gradient(ellipse at 40% 35%, oklch(0.20 0.012 55) 0%, oklch(0.14 0.007 55) 70%)",
            boxShadow:
              "0 8px 40px oklch(0 0 0 / 60%), inset 0 1px 0 oklch(1 0 0 / 6%)",
          }}
        />

        {/* Label on table */}
        <div className="absolute text-center pointer-events-none select-none">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/40">BUNKER</p>
        </div>

        {/* Bunker door — right side, outside the table edge */}
        <div
          className="absolute"
          style={{
            left: `calc(50% + ${tableRadius * 0.85}px)`,
            top: "50%",
            transform: "translateY(-50%)",
          }}
        >
          <EliminationDoor eliminatedName={recentlyEliminatedName} />
        </div>

        {/* Player seats */}
        {players.map((player, i) => (
          <PlayerSeat
            key={player.id}
            player={player}
            isMe={player.user_id === currentUserId}
            isActiveTurn={activeTurnPlayerId === player.id}
            seatIndex={i}
            totalSeats={players.length}
            tableRadius={tableRadius}
            onClick={() => setSelectedPlayer(player)}
          />
        ))}
      </div>

      {/* Player info side sheet */}
      <PlayerInfoSheet
        player={selectedPlayerLive}
        isMe={selectedPlayerLive?.user_id === currentUserId}
        onClose={() => setSelectedPlayer(null)}
      />
    </div>
  );
}

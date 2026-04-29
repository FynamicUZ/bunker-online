"use client";

import { motion } from "framer-motion";
import { Crown, Bot } from "lucide-react";
import type { Character, CharacterField } from "@/lib/game/types";

export interface SeatPlayer {
  id: string;
  nickname: string;
  user_id: string;
  is_host: boolean;
  is_alive: boolean;
  is_bot?: boolean;
  character: Character | null;
  revealed_fields: CharacterField[];
  reveal_order?: number | null;
}

interface PlayerSeatProps {
  player: SeatPlayer;
  isMe: boolean;
  isActiveTurn: boolean;
  seatIndex: number;
  totalSeats: number;
  tableRadius: number;
  onClick: () => void;
}

function getSeatPosition(index: number, total: number, radius: number) {
  // Start from top (-π/2), go clockwise
  const angle = (2 * Math.PI * index) / total - Math.PI / 2;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  return { x, y };
}

export default function PlayerSeat({
  player,
  isMe,
  isActiveTurn,
  seatIndex,
  totalSeats,
  tableRadius,
  onClick,
}: PlayerSeatProps) {
  const { x, y } = getSeatPosition(seatIndex, totalSeats, tableRadius);
  const revealedCount = player.revealed_fields?.length ?? 0;

  return (
    <motion.div
      className="absolute"
      style={{
        left: "50%",
        top: "50%",
        transform: `translate(calc(${x}px - 50%), calc(${y}px - 50%))`,
      }}
      initial={false}
    >
      <motion.button
        onClick={onClick}
        disabled={!player.is_alive}
        whileHover={player.is_alive ? { scale: 1.08 } : {}}
        whileTap={player.is_alive ? { scale: 0.96 } : {}}
        className="relative flex flex-col items-center gap-1 focus:outline-none"
      >
        {/* Active turn ring */}
        {isActiveTurn && player.is_alive && (
          <motion.div
            className="absolute inset-[-8px] rounded-full glow-amber"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
        )}

        {/* Avatar circle */}
        <motion.div
          className={[
            "relative flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-bold select-none",
            isActiveTurn && player.is_alive
              ? "border-[var(--bunker-amber)] bg-[oklch(0.22_0.04_60)]"
              : isMe
                ? "border-[var(--bunker-rust)] bg-[oklch(0.20_0.06_38)]"
                : "border-border bg-card",
            !player.is_alive && "opacity-40 grayscale",
          ].join(" ")}
          animate={!player.is_alive ? { y: 4 } : {}}
        >
          {player.nickname.charAt(0).toUpperCase()}

          {/* Host crown */}
          {player.is_host && (
            <Crown className="absolute -top-3.5 left-1/2 -translate-x-1/2 h-4 w-4 text-[var(--bunker-amber)]" />
          )}

          {/* Bot indicator */}
          {player.is_bot && (
            <Bot className="absolute -bottom-1 -right-1 h-4 w-4 text-muted-foreground bg-card rounded-full p-0.5" />
          )}
        </motion.div>

        {/* Nickname */}
        <span
          className={[
            "max-w-[88px] truncate text-center text-xs font-semibold leading-tight",
            isMe ? "text-[var(--bunker-amber)]" : "text-foreground",
            !player.is_alive && "text-muted-foreground line-through",
          ].join(" ")}
        >
          {player.nickname}
          {isMe && " (sen)"}
        </span>

        {/* Revealed cards count */}
        {player.is_alive && (
          <span className="text-[10px] text-muted-foreground tabular-nums">
            {revealedCount}/5
          </span>
        )}

        {/* Active turn label */}
        {isActiveTurn && player.is_alive && (
          <motion.span
            className="absolute -bottom-7 whitespace-nowrap rounded bg-[var(--bunker-amber)] px-2 py-0.5 text-[10px] font-bold text-black"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {isMe ? "Sizning navbatingiz!" : "So'zlaydi..."}
          </motion.span>
        )}
      </motion.button>
    </motion.div>
  );
}

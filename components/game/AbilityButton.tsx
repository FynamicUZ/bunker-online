"use client";

import { useState } from "react";
import { Zap } from "lucide-react";
import { getAbility } from "@/lib/game/abilities";
import AbilityActivationDialog from "./AbilityActivationDialog";

interface AbilityButtonProps {
  abilityId: string | null;
  used: boolean;
  roomId: string;
  alivePlayers: { id: string; nickname: string }[];
  myPlayerId: string;
  currentRound: number;
}

export default function AbilityButton({
  abilityId,
  used,
  roomId,
  alivePlayers,
  myPlayerId,
  currentRound,
}: AbilityButtonProps) {
  const [open, setOpen] = useState(false);
  const ability = abilityId ? getAbility(abilityId) : null;

  if (!ability) return null;

  return (
    <>
      <button
        onClick={() => !used && setOpen(true)}
        disabled={used}
        title={ability.description}
        className={[
          "flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-all",
          used
            ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
            : "border-[var(--bunker-amber)]/60 text-[var(--bunker-amber)] hover:bg-[var(--bunker-amber)]/10 hover:border-[var(--bunker-amber)]",
        ].join(" ")}
      >
        <Zap className="h-3.5 w-3.5" />
        {used ? "Ishlatildi" : ability.name}
      </button>

      <AbilityActivationDialog
        open={open}
        onClose={() => setOpen(false)}
        ability={ability}
        roomId={roomId}
        alivePlayers={alivePlayers.filter((p) => p.id !== myPlayerId)}
        currentRound={currentRound}
      />
    </>
  );
}

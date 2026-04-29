"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import type { Ability } from "@/lib/game/abilities";
import { activateAbility } from "@/app/actions";

const CATEGORY_LABELS: Record<string, string> = {
  defensive: "Himoya",
  aggressive: "Hujum",
  strategic: "Strategik",
  information: "Ma'lumot",
};

const CATEGORY_COLORS: Record<string, string> = {
  defensive: "bg-emerald-500/20 text-emerald-400",
  aggressive: "bg-red-500/20 text-red-400",
  strategic: "bg-blue-500/20 text-blue-400",
  information: "bg-purple-500/20 text-purple-400",
};

interface AbilityActivationDialogProps {
  open: boolean;
  onClose: () => void;
  ability: Ability;
  roomId: string;
  alivePlayers: { id: string; nickname: string }[];
  currentRound: number;
}

export default function AbilityActivationDialog({
  open,
  onClose,
  ability,
  roomId,
  alivePlayers,
  currentRound,
}: AbilityActivationDialogProps) {
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const needsTarget =
    ability.targetType === "player" ||
    ability.targetType === "player_card";

  const canActivate = !needsTarget || selectedPlayer !== null;

  const handleActivate = useCallback(async () => {
    if (!canActivate) return;
    setLoading(true);
    const { error } = await activateAbility(roomId, ability.id, selectedPlayer, { round: currentRound });
    if (error) {
      toast.error(error);
    } else {
      toast.success(`${ability.name} ishlatildi!`);
      onClose();
    }
    setLoading(false);
  }, [canActivate, roomId, ability, selectedPlayer, currentRound, onClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-[var(--bunker-amber)]" />
            <DialogTitle>{ability.name}</DialogTitle>
            <span
              className={[
                "ml-auto rounded px-1.5 py-0.5 text-[10px] font-semibold",
                CATEGORY_COLORS[ability.category] ?? "",
              ].join(" ")}
            >
              {CATEGORY_LABELS[ability.category]}
            </span>
          </div>
          <DialogDescription>{ability.description}</DialogDescription>
        </DialogHeader>

        {/* Player picker */}
        {needsTarget && (
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">O&apos;yinchini tanlang:</p>
            <div className="grid grid-cols-2 gap-1.5">
              {alivePlayers.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlayer(p.id)}
                  className={[
                    "rounded-md border px-3 py-2 text-sm font-medium transition-colors text-left truncate",
                    selectedPlayer === p.id
                      ? "border-[var(--bunker-amber)] bg-[var(--bunker-amber)]/10 text-[var(--bunker-amber)]"
                      : "border-border hover:border-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {p.nickname}
                </button>
              ))}
            </div>
          </div>
        )}

        {ability.appliedAtTally && (
          <p className="text-[11px] text-muted-foreground/70 italic">
            Bu imkoniyat ovoz natijasida qo&apos;llaniladi.
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            Bekor
          </Button>
          <Button
            className="flex-1 gap-1.5"
            disabled={!canActivate || loading}
            onClick={handleActivate}
          >
            <Zap className="h-3.5 w-3.5" />
            {loading ? "Qo'llanmoqda..." : "Ishlatish"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { X, Lock, Briefcase, Heart, Gamepad2, Sparkles, Package, Crown, Bot, Dna } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { Character, CharacterField } from "@/lib/game/types";
import type { SeatPlayer } from "./PlayerSeat";

const FIELD_CONFIGS: { key: CharacterField; label: string; icon: React.ReactNode }[] = [
  { key: "biology",    label: "Biologiya",  icon: <Dna className="h-3.5 w-3.5" /> },
  { key: "profession", label: "Kasb",       icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "health",     label: "Salomatlik", icon: <Heart className="h-3.5 w-3.5" /> },
  { key: "hobby",      label: "Hobbi",      icon: <Gamepad2 className="h-3.5 w-3.5" /> },
  { key: "trait",      label: "Xarakter",   icon: <Sparkles className="h-3.5 w-3.5" /> },
  { key: "extra",      label: "Qo'shimcha", icon: <Package className="h-3.5 w-3.5" /> },
];

interface PlayerInfoSheetProps {
  player: SeatPlayer | null;
  isMe: boolean;
  onClose: () => void;
}

function FieldRow({
  field,
  label,
  icon,
  character,
  visible,
}: {
  field: CharacterField;
  label: string;
  icon: React.ReactNode;
  character: Character;
  visible: boolean;
}) {
  let nameText = "";
  let descText = "";

  if (visible) {
    if (field === "biology") {
      nameText = `${character.biology.gender === "erkak" ? "Erkak" : "Ayol"}, ${character.biology.age} yosh`;
      descText = character.biology.description;
    } else {
      const attr = character[field] as { name: string; description: string };
      nameText = attr.name;
      descText = attr.description;
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-muted-foreground">
        {icon}
        {label}
      </div>
      {visible ? (
        <div className="rounded-md border border-border/50 bg-card/60 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">{nameText}</p>
          <p className="text-[11px] leading-relaxed text-muted-foreground mt-0.5">{descText}</p>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-dashed border-border/40 px-3 py-2">
          <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          <p className="text-[11px] italic text-muted-foreground/50">Hali ochilmagan</p>
        </div>
      )}
    </div>
  );
}

export default function PlayerInfoSheet({ player, isMe, onClose }: PlayerInfoSheetProps) {
  return (
    <AnimatePresence>
      {player && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.aside
            key="sheet"
            className="fixed right-0 top-0 bottom-0 z-50 flex w-[320px] max-w-[90vw] flex-col border-l border-border bg-[oklch(0.14_0.007_55)] shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold",
                    isMe ? "border-[var(--bunker-rust)] bg-[oklch(0.20_0.06_38)]" : "border-border bg-card",
                    !player.is_alive && "grayscale opacity-50",
                  ].join(" ")}
                >
                  {player.nickname.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold">{player.nickname}</span>
                    {isMe && <Badge variant="secondary" className="text-[9px] h-4 px-1">Siz</Badge>}
                    {player.is_host && <Crown className="h-3.5 w-3.5 text-[var(--bunker-amber)]" />}
                    {player.is_bot && <Bot className="h-3.5 w-3.5 text-muted-foreground" />}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={[
                        "text-[10px] font-semibold uppercase tracking-wide",
                        player.is_alive ? "text-emerald-400" : "text-destructive",
                      ].join(" ")}
                    >
                      {player.is_alive ? "Tirik" : "Eliminated"}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {player.revealed_fields?.length ?? 0}/5 ochilgan
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* All fields — revealed or locked */}
            {player.character && (
              <>
                <Separator />
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {FIELD_CONFIGS.map(({ key, label, icon }) => (
                    <FieldRow
                      key={key}
                      field={key}
                      label={label}
                      icon={icon}
                      character={player.character!}
                      visible={isMe || (player.revealed_fields ?? []).includes(key)}
                    />
                  ))}
                </div>
              </>
            )}

            {!player.character && (
              <div className="flex flex-1 items-center justify-center">
                <p className="text-sm text-muted-foreground animate-pulse">
                  Karakter yuklanmoqda...
                </p>
              </div>
            )}

            {/* Eliminated overlay */}
            {!player.is_alive && (
              <div className="border-t border-destructive/30 bg-destructive/10 px-4 py-3">
                <p className="text-center text-xs font-semibold text-destructive">
                  Bu o&apos;yinchi bunkerdan chiqarib yuborildi
                </p>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

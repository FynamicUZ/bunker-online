"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { startGame, leaveRoom, updateRoomSettings } from "@/app/actions";

const MIN_PLAYERS = 2;

interface Room {
  id: string;
  code: string;
  host_id: string;
  status: string;
  max_players: number;
  bunker_capacity: number;
}

interface Player {
  id: string;
  room_id: string;
  nickname: string;
  user_id: string;
  is_host: boolean;
  is_alive: boolean;
  joined_at: string;
}

interface Props {
  room: Room;
  initialPlayers: Player[];
  currentUserId: string;
}

export default function LobbyView({ room, initialPlayers, currentUserId }: Props) {
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [starting, setStarting] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [bunkerCapacity, setBunkerCapacity] = useState(room.bunker_capacity ?? 5);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const currentPlayer = players.find((p) => p.user_id === currentUserId);
  const isHost = currentPlayer?.is_host ?? false;
  const canStart = players.length >= MIN_PLAYERS;

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(room.code);
    toast.success("Kod nusxalandi!");
  }, [room.code]);

  const saveSettings = useCallback((bc: number) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      const { error } = await updateRoomSettings(room.id, { bunkerCapacity: bc });
      if (error) toast.error(error);
    }, 600);
  }, [room.id]);

  const handleBunkerCapacityChange = (val: number) => {
    const clamped = Math.max(1, val);
    setBunkerCapacity(clamped);
    saveSettings(clamped);
  };

  // Realtime: players jadvaliga obuna bo'lish
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setPlayers((prev) => {
              const exists = prev.some((p) => p.id === (payload.new as Player).id);
              return exists ? prev : [...prev, payload.new as Player];
            });
          } else if (payload.eventType === "UPDATE") {
            setPlayers((prev) =>
              prev.map((p) => (p.id === (payload.new as Player).id ? (payload.new as Player) : p))
            );
          } else if (payload.eventType === "DELETE") {
            setPlayers((prev) => prev.filter((p) => p.id !== (payload.old as Player).id));
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if ((payload.new as Room).status === "playing") {
            router.push(`/room/${room.code}/game`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id, room.code, router]);

  const handleStartGame = async () => {
    if (!canStart) return;
    setStarting(true);

    const { error } = await startGame(room.id);

    if (error) {
      toast.error(error);
      setStarting(false);
    }
  };

  const handleLeave = async () => {
    if (leaving) return;
    setLeaving(true);
    const { error } = await leaveRoom(room.id);
    if (error) {
      toast.error(error);
      setLeaving(false);
      return;
    }
    router.push("/");
  };

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-12">
      {/* Sarlavha */}
      <div className="text-center">
        <p className="text-muted-foreground text-sm uppercase tracking-widest">Xona kodi</p>
        <button
          onClick={handleCopyCode}
          className="font-mono text-5xl font-black tracking-widest transition-opacity hover:opacity-70 sm:text-6xl"
          title="Nusxalash uchun bosing"
        >
          {room.code}
        </button>
        <p className="text-muted-foreground mt-1 text-xs">
          Do&apos;stlaringizga yuboring — ular shu kod bilan kiradi
        </p>
      </div>

      <Separator className="max-w-sm w-full" />

      {/* O'yinchilar ro'yxati */}
      <div className="w-full max-w-sm space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            O&apos;yinchilar
          </h2>
          <span className="text-muted-foreground text-sm">
            {players.length} / {room.max_players}
          </span>
        </div>

        <ul className="space-y-2">
          {players.map((player) => (
            <li
              key={player.id}
              className="flex items-center justify-between rounded-lg border px-4 py-2.5"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{player.nickname}</span>
                {player.user_id === currentUserId && (
                  <Badge variant="outline" className="text-xs">
                    Sen
                  </Badge>
                )}
              </div>
              {player.is_host && (
                <Badge variant="secondary" className="text-xs">
                  Host
                </Badge>
              )}
            </li>
          ))}
        </ul>

        {players.length < MIN_PLAYERS && (
          <p className="text-muted-foreground text-center text-xs">
            O&apos;yin boshlash uchun kamida {MIN_PLAYERS} o&apos;yinchi kerak (
            {MIN_PLAYERS - players.length} ta qoldi)
          </p>
        )}
      </div>

      {/* Host game settings */}
      {isHost && (
        <div className="w-full max-w-sm space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide">Sozlamalar</h2>

          <div className="rounded-lg border border-border bg-card/60 px-4 py-3 space-y-4">
            {/* Bunker capacity */}
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium">Bunker sig&apos;imi</p>
                <p className="text-[11px] text-muted-foreground">Bunkerdagi joylar soni</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted text-sm font-bold hover:bg-muted/80 transition-colors"
                  onClick={() => handleBunkerCapacityChange(bunkerCapacity - 1)}
                >−</button>
                <span className="w-10 text-center text-sm font-semibold tabular-nums">{bunkerCapacity} joy</span>
                <button
                  className="flex h-7 w-7 items-center justify-center rounded border border-border bg-muted text-sm font-bold hover:bg-muted/80 transition-colors"
                  onClick={() => handleBunkerCapacityChange(bunkerCapacity + 1)}
                >+</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room info for non-hosts */}
      {!isHost && (
        <div className="text-muted-foreground flex gap-4 text-xs">
          <span>Bunker: {room.bunker_capacity} joy</span>
        </div>
      )}

      {/* Boshlash tugmasi (faqat host) */}
      {isHost && (
        <Button
          size="lg"
          disabled={!canStart || starting}
          onClick={handleStartGame}
          className="w-full max-w-sm"
        >
          {starting ? "Boshlanmoqda..." : "O'yinni boshlash"}
        </Button>
      )}
      {!isHost && (
        <p className="text-muted-foreground text-sm">
          Host o&apos;yinni boshlaguncha kuting...
        </p>
      )}

      <Button
        variant="ghost"
        size="sm"
        className="w-full max-w-sm"
        disabled={leaving}
        onClick={handleLeave}
      >
        {leaving ? "Chiqilmoqda..." : "Xonadan chiqish"}
      </Button>
    </main>
  );
}

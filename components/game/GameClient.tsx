"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import CharacterCard from "@/components/game/CharacterCard";
import RevealDialog from "@/components/game/RevealDialog";
import VotingPanel from "@/components/game/VotingPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { revealField, advanceRound, setPhase } from "@/app/actions";
import type { Character, CharacterField } from "@/lib/game/types";
import scenariosData from "@/data/scenarios.json";

type RevealableField = Exclude<CharacterField, "age" | "gender">;
const REVEALABLE: RevealableField[] = ["profession", "health", "hobby", "trait", "extra"];

interface ScenarioData {
  id: string;
  name: string;
  description: string;
  bunkerDuration: string;
  bunkerSize: string;
}

interface PlayerRow {
  id: string;
  nickname: string;
  user_id: string;
  is_host: boolean;
  is_alive: boolean;
  character: Character | null;
  revealed_fields: CharacterField[];
}

interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  scenario_id: string | null;
  bunker_capacity: number;
  max_players: number;
  current_round: number;
  current_phase: "reveal" | "discussion" | "voting" | null;
  status: string;
}

interface Props {
  code: string;
}

export default function GameClient({ code }: Props) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [settingPhase, setSettingPhase] = useState(false);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Autentifikatsiya xatosi"); setLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("id, code, host_id, scenario_id, bunker_capacity, max_players, current_round, current_phase, status")
        .eq("code", code)
        .maybeSingle();

      if (roomErr || !roomData) { setError("Xona topilmadi"); setLoading(false); return; }
      setRoom(roomData as RoomRow);

      const { data: playersData } = await supabase
        .from("players")
        .select("id, nickname, user_id, is_host, is_alive, character, revealed_fields")
        .eq("room_id", roomData.id)
        .order("joined_at", { ascending: true });

      setPlayers((playersData ?? []) as PlayerRow[]);

      if (roomData.scenario_id) {
        const found = (scenariosData as ScenarioData[]).find(
          (s) => s.id === roomData.scenario_id
        );
        if (found) setScenario(found);
      }

      if (roomData.status === "finished") {
        router.push(`/room/${code}/results`);
        return;
      }

      setLoading(false);
    }

    load();
  }, [code, router]);

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`game-room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === (payload.new as PlayerRow).id ? (payload.new as PlayerRow) : p
            )
          );
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
          const updated = payload.new as RoomRow;
          if (updated.status === "finished") {
            router.push(`/room/${code}/results`);
            return;
          }
          setRoom((prev) => (prev ? { ...prev, ...updated } : prev));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room?.id, code, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────────────────────
  const me = players.find((p) => p.user_id === currentUserId) ?? null;
  const isHost = room?.host_id === currentUserId;
  const currentRound = room?.current_round ?? 1;
  const isVoting = room?.current_phase === "voting";
  const hasRevealedThisRound = (me?.revealed_fields.length ?? 0) >= currentRound;
  const hiddenFields = REVEALABLE.filter((f) => !(me?.revealed_fields ?? []).includes(f));
  const canReveal = me?.is_alive && !hasRevealedThisRound && hiddenFields.length > 0 && !isVoting;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReveal = useCallback(
    async (field: RevealableField) => {
      if (!me) return;
      setRevealing(true);
      setRevealOpen(false);
      const { error } = await revealField(me.id, field);
      if (error) toast.error(error);
      setRevealing(false);
    },
    [me]
  );

  const handleAdvanceRound = useCallback(async () => {
    if (!room) return;
    setAdvancing(true);
    const { error } = await advanceRound(room.id);
    if (error) toast.error(error);
    setAdvancing(false);
  }, [room]);

  const handleStartVoting = useCallback(async () => {
    if (!room) return;
    setSettingPhase(true);
    const { error } = await setPhase(room.id, "voting");
    if (error) toast.error(error);
    setSettingPhase(false);
  }, [room]);

  const handleCancelVoting = useCallback(async () => {
    if (!room) return;
    setSettingPhase(true);
    const { error } = await setPhase(room.id, null);
    if (error) toast.error(error);
    setSettingPhase(false);
  }, [room]);

  // ── Render guards ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">Yuklanmoqda...</p>
      </main>
    );
  }

  if (error || !room || !me) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-destructive text-sm">{error ?? "O'yinchi topilmadi"}</p>
      </main>
    );
  }

  if (!me.character) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">
          Karakter tayinlanmoqda...
        </p>
      </main>
    );
  }

  const otherPlayers = players.filter((p) => p.user_id !== currentUserId);

  return (
    <>
      <RevealDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        hiddenFields={hiddenFields}
        onReveal={handleReveal}
        loading={revealing}
      />

      <main className="flex flex-1 flex-col gap-6 px-4 py-8 max-w-2xl mx-auto w-full">
        {/* Stsenariy banneri */}
        {scenario && (
          <div className="rounded-xl border p-4 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">{scenario.name}</span>
              <Badge variant="destructive" className="text-xs">Favqulodda holat</Badge>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {scenario.description}
            </p>
            <div className="flex gap-4 text-xs text-muted-foreground pt-1">
              <span>
                Bunker muddati:{" "}
                <strong className="text-foreground">{scenario.bunkerDuration}</strong>
              </span>
              <span>
                Bunker joylari:{" "}
                <strong className="text-foreground">{room.bunker_capacity}</strong>
              </span>
            </div>
          </div>
        )}

        {/* Bosqich / Ovozlash paneli */}
        {isVoting ? (
          <div className="space-y-3">
            <VotingPanel
              roomId={room.id}
              round={currentRound}
              players={players}
              myPlayerId={me.id}
              currentUserId={currentUserId ?? ""}
              isHost={isHost}
            />
            {isHost && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                disabled={settingPhase}
                onClick={handleCancelVoting}
              >
                Ovozlashni bekor qilish
              </Button>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Bosqich</p>
              <p className="text-2xl font-black leading-none">{currentRound}</p>
            </div>
            {isHost && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={settingPhase}
                  onClick={handleStartVoting}
                >
                  {settingPhase ? "..." : "Ovozlash →"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={advancing}
                  onClick={handleAdvanceRound}
                >
                  {advancing ? "..." : "Keyingi bosqich"}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Sizning kartangiz */}
        {!isVoting && (
          <section className="space-y-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Sizning kartangiz
            </h2>
            <CharacterCard
              character={me.character}
              revealedFields={me.revealed_fields ?? []}
              isOwn
              playerName={me.nickname}
            />
            {canReveal ? (
              <Button
                className="w-full"
                onClick={() => setRevealOpen(true)}
                disabled={revealing}
              >
                {revealing ? "Ochilmoqda..." : "Maydonimni ochish"}
              </Button>
            ) : !me.is_alive ? (
              <p className="text-center text-xs text-destructive">
                Siz bunkersiz qoldingiz.
              </p>
            ) : hasRevealedThisRound ? (
              <p className="text-center text-xs text-muted-foreground">
                Bu bosqichda maydoningizni ochdingiz. Host keyingi bosqichni boshlaguncha kuting.
              </p>
            ) : (
              <p className="text-center text-xs text-muted-foreground">
                Barcha maydonlar ochiq.
              </p>
            )}
          </section>
        )}

        {/* Boshqa o'yinchilar */}
        {otherPlayers.length > 0 && (
          <>
            <Separator />
            <section className="space-y-3">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Boshqa o&apos;yinchilar ({otherPlayers.length})
              </h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {otherPlayers.map((p) =>
                  p.character ? (
                    <div key={p.id} className={p.is_alive ? "" : "opacity-50"}>
                      <CharacterCard
                        character={p.character}
                        revealedFields={p.revealed_fields ?? []}
                        playerName={p.is_alive ? p.nickname : `${p.nickname} ✕`}
                      />
                    </div>
                  ) : null
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}

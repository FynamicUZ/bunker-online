"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import RoundTable from "@/components/game/RoundTable";
import RevealDialog from "@/components/game/RevealDialog";
import VotingPanel from "@/components/game/VotingPanel";
import ChatPanel from "@/components/game/ChatPanel";
import NotesPanel from "@/components/game/NotesPanel";
import AbilityButton from "@/components/game/AbilityButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, StickyNote, ChevronRight, SkipForward } from "lucide-react";
import {
  revealField,
  setRoundField,
  advanceRound,
  setPhase,
  confirmStillHere,
  triggerAfkAdvance,
} from "@/app/actions";
import TurnTimer from "@/components/game/TurnTimer";
import AfkWarningDialog from "@/components/game/AfkWarningDialog";
import type { Character, CharacterField } from "@/lib/game/types";
import type { SeatPlayer } from "@/components/game/PlayerSeat";
import scenariosData from "@/data/scenarios.json";

const ALL_FIELDS: CharacterField[] = ["biology", "profession", "health", "hobby", "trait", "extra"];

const FIELD_LABELS: Record<CharacterField, string> = {
  biology: "Biologiya",
  profession: "Kasb",
  health: "Salomatlik",
  hobby: "Hobbi",
  trait: "Xarakter",
  extra: "Qo'shimcha",
};

interface ScenarioData {
  id: string;
  name: string;
  description: string;
  bunkerDuration: string;
}

interface PlayerRow {
  id: string;
  nickname: string;
  user_id: string;
  is_host: boolean;
  is_alive: boolean;
  is_bot?: boolean;
  character: Character | null;
  revealed_fields: CharacterField[];
  reveal_order?: number | null;
  special_ability_id?: string | null;
  special_ability_used?: boolean;
}

interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  scenario_id: string | null;
  bunker_capacity: number;
  current_round: number;
  current_phase: "reveal" | "discussion" | "voting" | null;
  current_turn_index: number;
  current_round_field: CharacterField | null;
  turn_duration: number;
  turn_started_at: string | null;
  turn_warning_at: string | null;
  turn_grace_at: string | null;
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
  const [chatOpen, setChatOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [recentlyEliminatedName, setRecentlyEliminatedName] = useState<string | null>(null);
  const afkTriggeredRef = useRef(false);
  const elimTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Autentifikatsiya xatosi"); setLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("id, code, host_id, scenario_id, bunker_capacity, current_round, current_phase, current_turn_index, current_round_field, turn_duration, turn_started_at, turn_warning_at, turn_grace_at, status")
        .eq("code", code)
        .maybeSingle();

      if (roomErr || !roomData) { setError("Xona topilmadi"); setLoading(false); return; }
      setRoom(roomData as RoomRow);

      const { data: playersData } = await supabase
        .from("players")
        .select("id, nickname, user_id, is_host, is_alive, character, revealed_fields, reveal_order, is_bot, special_ability_id, special_ability_used")
        .eq("room_id", roomData.id)
        .order("joined_at", { ascending: true });

      setPlayers((playersData ?? []) as PlayerRow[]);

      if (roomData.scenario_id) {
        const found = (scenariosData as ScenarioData[]).find((s) => s.id === roomData.scenario_id);
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
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as PlayerRow;
          setPlayers((prev) => prev.map((p) => p.id === updated.id ? updated : p));

          const prev = players.find((p) => p.id === updated.id);
          if (prev?.is_alive && !updated.is_alive) {
            setRecentlyEliminatedName(updated.nickname);
            if (elimTimer.current) clearTimeout(elimTimer.current);
            elimTimer.current = setTimeout(() => setRecentlyEliminatedName(null), 4000);
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const updated = payload.new as RoomRow;
          if (updated.status === "finished") { router.push(`/room/${code}/results`); return; }
          if (updated.scenario_id && !scenario) {
            const found = (scenariosData as ScenarioData[]).find((s) => s.id === updated.scenario_id);
            if (found) setScenario(found);
          }
          setRoom((prev) => prev ? { ...prev, ...updated } : prev);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (elimTimer.current) clearTimeout(elimTimer.current);
    };
  }, [room?.id, code, router]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ─────────────────────────────────────────────────────────
  const me = players.find((p) => p.user_id === currentUserId) ?? null;
  const isHost = room?.host_id === currentUserId;
  const currentRound = room?.current_round ?? 1;
  const isVoting = room?.current_phase === "voting";
  const hasRevealedThisRound = (me?.revealed_fields.length ?? 0) >= currentRound;
  const hiddenFields = ALL_FIELDS.filter((f) => !(me?.revealed_fields ?? []).includes(f));
  const roundField = room?.current_round_field ?? null;
  const turnDuration = room?.turn_duration ?? 25;

  // canReveal: if round field is forced, check it's still hidden; else check any hidden field exists
  const canReveal = me?.is_alive &&
    !hasRevealedThisRound &&
    !isVoting &&
    (roundField ? !me?.revealed_fields.includes(roundField) : hiddenFields.length > 0);

  const aliveCount = players.filter((p) => p.is_alive).length;

  // Turn-order derived state
  const alivePlayers = players.filter((p) => p.is_alive);
  const turnIndex = room?.current_turn_index ?? 0;
  const activeTurnPlayer = alivePlayers.find((p) => (p.reveal_order ?? 0) === turnIndex % Math.max(alivePlayers.length, 1)) ?? null;
  const isMyTurn = activeTurnPlayer?.user_id === currentUserId && !isVoting;

  // Derived: show AFK warning modal when server has set turn_warning_at for my turn
  const showAfkWarning = Boolean(isMyTurn && room?.turn_warning_at && !room?.turn_grace_at);

  // AFK: auto-trigger bot if grace period expired (20s after grace confirmed)
  useEffect(() => {
    if (!isMyTurn || !room?.turn_grace_at || !me) return;
    const graceExpiry = new Date(room.turn_grace_at).getTime() + 20_000;
    const delay = Math.max(0, graceExpiry - Date.now());
    const t = setTimeout(() => {
      if (!afkTriggeredRef.current) {
        afkTriggeredRef.current = true;
        triggerAfkAdvance(room.id, me.id);
      }
    }, delay);
    return () => clearTimeout(t);
  }, [isMyTurn, room?.turn_grace_at, me]); // eslint-disable-line react-hooks/exhaustive-deps

  // AFK: turn expires → set warning on server
  useEffect(() => {
    if (!isMyTurn || isVoting || !room?.turn_started_at || room?.turn_warning_at) return;
    const expiry = new Date(room.turn_started_at).getTime() + turnDuration * 1000;
    const delay = Math.max(0, expiry - Date.now());
    const t = setTimeout(async () => {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase.from("rooms").update({ turn_warning_at: new Date().toISOString() }).eq("id", room.id);
    }, delay);
    return () => clearTimeout(t);
  }, [isMyTurn, isVoting, room?.turn_started_at, room?.turn_warning_at, turnDuration]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleReveal = useCallback(async (field: CharacterField) => {
    if (!me || !room) return;
    setRevealing(true);
    setRevealOpen(false);

    // If this is the first player of the round (no field set yet), lock in the field for everyone
    if (!room.current_round_field) {
      const { error: rfError } = await setRoundField(room.id, field);
      if (rfError) { toast.error(rfError); setRevealing(false); return; }
    }

    const { error } = await revealField(me.id, field);
    if (error) toast.error(error);
    else {
      const supabase = (await import("@/lib/supabase/client")).createClient();
      await supabase
        .from("rooms")
        .update({
          current_turn_index: (room.current_turn_index ?? 0) + 1,
          turn_started_at: new Date().toISOString(),
          turn_warning_at: null,
          turn_grace_at: null,
        })
        .eq("id", room.id);
    }
    setRevealing(false);
    afkTriggeredRef.current = false;
  }, [me, room]);

  const handleConfirmStillHere = useCallback(async () => {
    if (!room) return;
    await confirmStillHere(room.id);
  }, [room]);

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
        <p className="text-muted-foreground animate-pulse text-sm">Karakter tayinlanmoqda...</p>
      </main>
    );
  }

  const seatPlayers: SeatPlayer[] = players.map((p) => ({
    ...p,
    is_bot: p.is_bot ?? false,
    reveal_order: p.reveal_order ?? null,
  }));

  return (
    <div className="game-root flex h-dvh flex-col overflow-hidden">
      {/* Field picker dialog — only shown to first player of the round */}
      <RevealDialog
        open={revealOpen}
        onOpenChange={setRevealOpen}
        hiddenFields={hiddenFields}
        onReveal={handleReveal}
        loading={revealing}
        isFirstPlayer
      />

      <AfkWarningDialog
        open={showAfkWarning}
        warningStartedAt={room?.turn_warning_at ?? null}
        onConfirm={handleConfirmStillHere}
      />

      {/* Top scenario banner */}
      {scenario && (
        <div className="flex items-center justify-between border-b border-border/40 bg-card/60 px-4 py-2 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <Badge variant="destructive" className="text-[10px] shrink-0">Favqulodda</Badge>
            <span className="text-xs font-semibold truncate">{scenario.name}</span>
            <span className="text-[11px] text-muted-foreground hidden sm:block">
              {scenario.bunkerDuration} — {room.bunker_capacity} joy
            </span>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            {roundField && (
              <span className="text-[var(--bunker-amber)] font-semibold">
                {FIELD_LABELS[roundField]}
              </span>
            )}
            <span className="text-border">·</span>
            <span>{aliveCount} tirik</span>
            <span className="text-border">·</span>
            <span className="font-semibold text-foreground">Bosqich {currentRound}</span>
          </div>
        </div>
      )}

      {/* Main table area — fills all available space */}
      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        {/* Table fills the bulk of the space */}
        <div className="relative flex-1 min-h-0">
          <RoundTable
            players={seatPlayers}
            currentUserId={currentUserId ?? ""}
            activeTurnPlayerId={activeTurnPlayer?.id ?? null}
            recentlyEliminatedName={recentlyEliminatedName}
          />
        </div>

        {/* Timer strip — only when it's my turn */}
        {isMyTurn && !isVoting && room?.turn_started_at && (
          <div className="shrink-0 flex justify-center py-3">
            <TurnTimer
              turnStartedAt={room.turn_started_at}
              totalSeconds={turnDuration}
              onExpire={() => {/* AFK handled via effect */}}
              label="kartangizni oching"
            />
          </div>
        )}

        {/* Voting panel — scrollable section below table */}
        {isVoting && (
          <div className="shrink-0 max-h-64 overflow-y-auto px-4 pb-20 space-y-2">
            <VotingPanel
              roomId={room.id}
              round={currentRound}
              players={players}
              myPlayerId={me.id}
              currentUserId={currentUserId ?? ""}
              isHost={isHost}
            />
            {isHost && (
              <Button variant="ghost" size="sm" className="w-full" disabled={settingPhase} onClick={handleCancelVoting}>
                Ovozlashni bekor qilish
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Bottom HUD */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-between border-t border-border/40 bg-[oklch(0.12_0.006_60/90%)] px-4 py-2 backdrop-blur-md">
        {/* Left: notes toggle */}
        <button
          onClick={() => setNotesOpen((o) => !o)}
          className={[
            "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
            notesOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          ].join(" ")}
        >
          <StickyNote className="h-4 w-4" />
          Yozuvlar
        </button>

        {/* Center: action buttons */}
        <div className="flex items-center gap-2">
          {!isVoting && canReveal && isMyTurn && (
            roundField ? (
              // Not first player — reveal the forced field directly
              <Button size="sm" onClick={() => handleReveal(roundField)} disabled={revealing} className="gap-1.5 text-xs">
                <ChevronRight className="h-3.5 w-3.5" />
                {revealing ? "Ochilmoqda..." : `${FIELD_LABELS[roundField]} kartasini och`}
              </Button>
            ) : (
              // First player — open field picker dialog
              <Button size="sm" onClick={() => setRevealOpen(true)} disabled={revealing} className="gap-1.5 text-xs">
                <ChevronRight className="h-3.5 w-3.5" />
                {revealing ? "Ochilmoqda..." : "Karta turini tanlang"}
              </Button>
            )
          )}
          {!isVoting && isHost && (
            <>
              <Button size="sm" variant="destructive" disabled={settingPhase} onClick={handleStartVoting} className="text-xs">
                Ovozlash →
              </Button>
              <Button size="sm" variant="outline" disabled={advancing} onClick={handleAdvanceRound} className="text-xs gap-1">
                <SkipForward className="h-3.5 w-3.5" />
                Keyingi
              </Button>
            </>
          )}
          {!isVoting && me.is_alive && !isMyTurn && (
            <p className="text-[11px] text-muted-foreground">
              {roundField
                ? activeTurnPlayer
                  ? `${activeTurnPlayer.nickname} — ${FIELD_LABELS[roundField]}`
                  : `Navbat: ${FIELD_LABELS[roundField]}`
                : activeTurnPlayer
                  ? `${activeTurnPlayer.nickname} karta turini tanlaydi...`
                  : "Navbatingizni kuting..."}
            </p>
          )}
          {!me.is_alive && (
            <p className="text-[11px] text-destructive font-medium">Siz bunkersiz qoldingiz</p>
          )}
        </div>

        {/* Right: ability + chat toggles */}
        <div className="flex items-center gap-1.5">
          {me.is_alive && me.special_ability_id && (
            <AbilityButton
              abilityId={me.special_ability_id}
              used={me.special_ability_used ?? false}
              roomId={room.id}
              alivePlayers={players.filter((p) => p.is_alive).map((p) => ({ id: p.id, nickname: p.nickname }))}
              myPlayerId={me.id}
              currentRound={currentRound}
            />
          )}
          <button
            onClick={() => setChatOpen((o) => !o)}
            className={[
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              chatOpen ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            ].join(" ")}
          >
            <MessageSquare className="h-4 w-4" />
            Chat
          </button>
        </div>
      </div>

      {/* Floating panels */}
      <NotesPanel open={notesOpen} onClose={() => setNotesOpen(false)} roomCode={code} />
      <ChatPanel
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        roomId={room.id}
        myPlayerId={me.id}
        isAlive={me.is_alive}
        currentUserId={currentUserId ?? ""}
      />
    </div>
  );
}

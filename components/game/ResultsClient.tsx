"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import CharacterCard from "@/components/game/CharacterCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, ShieldX } from "lucide-react";
import { resetRoom } from "@/app/actions";
import type { Character, CharacterField } from "@/lib/game/types";
import scenariosData from "@/data/scenarios.json";

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
  status: string;
}

interface Props {
  code: string;
}

export default function ResultsClient({ code }: Props) {
  const router = useRouter();
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [room, setRoom] = useState<RoomRow | null>(null);
  const [scenario, setScenario] = useState<ScenarioData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setError("Autentifikatsiya xatosi"); setLoading(false); return; }
      setCurrentUserId(user.id);

      const { data: roomData } = await supabase
        .from("rooms")
        .select("id, code, host_id, scenario_id, bunker_capacity, status")
        .eq("code", code)
        .maybeSingle();

      if (!roomData) { setError("Xona topilmadi"); setLoading(false); return; }
      setRoom(roomData as RoomRow);

      // If game isn't finished yet, redirect back to game
      if (roomData.status !== "finished") {
        router.push(`/room/${code}/game`);
        return;
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("id, nickname, user_id, is_alive, character, revealed_fields")
        .eq("room_id", roomData.id)
        .order("joined_at", { ascending: true });

      setPlayers((playersData ?? []) as PlayerRow[]);

      if (roomData.scenario_id) {
        const found = (scenariosData as ScenarioData[]).find(
          (s) => s.id === roomData.scenario_id
        );
        if (found) setScenario(found);
      }

      setLoading(false);
    }

    load();
  }, [code, router]);

  // Realtime: when the host resets the room, jump everyone back to the lobby.
  useEffect(() => {
    if (!room) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`results-room:${room.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          if ((payload.new as RoomRow).status === "lobby") {
            router.replace(`/room/${code}`);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [room?.id, code, router]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">Yuklanmoqda...</p>
      </main>
    );
  }

  if (error || !room) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-destructive text-sm">{error ?? "Xatolik"}</p>
      </main>
    );
  }

  const survivors = players.filter((p) => p.is_alive);
  const eliminated = players.filter((p) => !p.is_alive);
  const isMyPlayerAlive = players.find((p) => p.user_id === currentUserId)?.is_alive ?? false;
  const isHost = room.host_id === currentUserId;

  const handlePlayAgain = async () => {
    if (resetting) return;
    setResetting(true);
    const { error } = await resetRoom(room.id);
    if (error) {
      toast.error(error);
      setResetting(false);
    }
    // On success the realtime listener redirects everyone to /room/{code}.
  };

  return (
    <main className="flex flex-1 flex-col gap-8 px-4 py-10 max-w-2xl mx-auto w-full">
      {/* Title */}
      <div className="text-center space-y-2">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">O&apos;yin tugadi</p>
        <h1 className="text-3xl font-black">
          {scenario?.name ?? "Bunker"}
        </h1>
        {isMyPlayerAlive ? (
          <Badge className="text-sm px-4 py-1">Siz bunkerdaydirsiz!</Badge>
        ) : (
          <Badge variant="destructive" className="text-sm px-4 py-1">
            Siz bunkersiz qoldingiz
          </Badge>
        )}
      </div>

      <Separator />

      {/* Survivors */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-green-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide">
            Bunkerdagilar ({survivors.length} / {room.bunker_capacity})
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {survivors.map((p) =>
            p.character ? (
              <CharacterCard
                key={p.id}
                character={p.character}
                revealedFields={p.revealed_fields ?? []}
                isOwn={p.user_id === currentUserId}
                playerName={p.nickname}
              />
            ) : null
          )}
        </div>
      </section>

      {eliminated.length > 0 && (
        <>
          <Separator />
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldX className="h-4 w-4 text-destructive" />
              <h2 className="text-sm font-semibold uppercase tracking-wide">
                Bunkersiz qolganlar ({eliminated.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 opacity-60">
              {eliminated.map((p) =>
                p.character ? (
                  <CharacterCard
                    key={p.id}
                    character={p.character}
                    revealedFields={p.revealed_fields ?? []}
                    isOwn={p.user_id === currentUserId}
                    playerName={p.nickname}
                  />
                ) : null
              )}
            </div>
          </section>
        </>
      )}

      <div className="flex flex-col gap-2">
        {isHost && (
          <Button onClick={handlePlayAgain} disabled={resetting}>
            {resetting ? "Tiklanmoqda..." : "Yana o'ynash"}
          </Button>
        )}
        {!isHost && (
          <p className="text-muted-foreground text-center text-xs">
            Host yangi o&apos;yin boshlasa, siz avtomatik xonaga qaytasiz.
          </p>
        )}
        <Button variant="outline" onClick={() => router.push("/")}>
          Bosh sahifaga qaytish
        </Button>
      </div>
    </main>
  );
}

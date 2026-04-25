"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import LobbyView from "@/components/lobby/LobbyView";

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
  code: string;
}

export default function RoomClient({ code }: Props) {
  const router = useRouter();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("Foydalanuvchi topilmadi");
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);

      const { data: roomData, error: roomErr } = await supabase
        .from("rooms")
        .select("*")
        .eq("code", code)
        .maybeSingle();

      if (roomErr || !roomData) {
        setError("Xona topilmadi");
        setLoading(false);
        return;
      }

      const { data: playersData } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomData.id)
        .order("joined_at", { ascending: true });

      const playerList = playersData ?? [];
      const isInRoom = playerList.some((p) => p.user_id === user.id);
      if (!isInRoom) {
        setError("Siz bu xonada emassiz");
        setLoading(false);
        return;
      }

      // Mid-game rejoin: jump straight to game/results based on room status.
      if (roomData.status === "playing") {
        router.replace(`/room/${code}/game`);
        return;
      }
      if (roomData.status === "finished") {
        router.replace(`/room/${code}/results`);
        return;
      }

      setRoom(roomData);
      setPlayers(playerList);
      setLoading(false);
    }

    load();
  }, [code, router]);

  if (loading) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-muted-foreground animate-pulse text-sm">Yuklanmoqda...</p>
      </main>
    );
  }

  if (error || !room || !currentUserId) {
    return (
      <main className="flex flex-1 items-center justify-center">
        <p className="text-destructive text-sm">{error ?? "Xatolik"}</p>
      </main>
    );
  }

  return (
    <LobbyView
      room={room}
      initialPlayers={players}
      currentUserId={currentUserId}
    />
  );
}

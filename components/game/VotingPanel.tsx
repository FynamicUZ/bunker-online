"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { castVote, tallyVotes } from "@/app/actions";
import { CheckCircle2, Vote } from "lucide-react";

interface Player {
  id: string;
  nickname: string;
  user_id: string;
  is_alive: boolean;
}

interface VotingPanelProps {
  roomId: string;
  round: number;
  players: Player[];
  myPlayerId: string;
  currentUserId: string;
  isHost: boolean;
}

export default function VotingPanel({
  roomId,
  round,
  players,
  myPlayerId,
  currentUserId,
  isHost,
}: VotingPanelProps) {
  const [myVote, setMyVote] = useState<string | null>(null);
  const [voteCount, setVoteCount] = useState(0);
  const [tallying, setTallying] = useState(false);
  const [voting, setVoting] = useState(false);

  const alivePlayers = players.filter((p) => p.is_alive);
  const totalVoters = alivePlayers.length;

  // Load existing vote for this round (rejoin case)
  useEffect(() => {
    const supabase = createClient();

    async function loadMyVote() {
      const { data } = await supabase
        .from("votes")
        .select("target_id")
        .eq("room_id", roomId)
        .eq("round", round)
        .eq("voter_id", myPlayerId)
        .maybeSingle();

      if (data) setMyVote(data.target_id as string);
    }

    async function loadVoteCount() {
      const { count } = await supabase
        .from("votes")
        .select("id", { count: "exact", head: true })
        .eq("room_id", roomId)
        .eq("round", round);

      setVoteCount(count ?? 0);
    }

    loadMyVote();
    loadVoteCount();

    // Realtime: watch votes table for new votes this round
    const channel = supabase
      .channel(`votes:${roomId}:${round}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "votes",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          setVoteCount((n) => n + 1);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, round, myPlayerId]);

  const handleVote = useCallback(
    async (targetId: string) => {
      if (myVote || voting) return;
      setVoting(true);
      const { error } = await castVote(roomId, myPlayerId, targetId, round);
      if (error) {
        toast.error(error);
      } else {
        setMyVote(targetId);
      }
      setVoting(false);
    },
    [myVote, voting, roomId, myPlayerId, round]
  );

  const handleTally = useCallback(async () => {
    setTallying(true);
    const result = await tallyVotes(roomId, round);
    if (result.error) {
      toast.error(result.error);
      setTallying(false);
      return;
    }
    if (result.eliminatedName) {
      toast.success(
        result.gameOver
          ? `${result.eliminatedName} chiqarildi. O'yin tugadi!`
          : `${result.eliminatedName} bunkersiz qoldi. Keyingi bosqich boshlanadi.`
      );
    }
    setTallying(false);
  }, [roomId, round]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between rounded-lg border px-4 py-3">
        <div className="flex items-center gap-2">
          <Vote className="h-4 w-4 text-destructive" />
          <span className="font-semibold text-sm">Ovozlash</span>
        </div>
        <span className="text-muted-foreground text-xs">
          {voteCount} / {totalVoters} ovoz berildi
        </span>
      </div>

      {/* Player list */}
      <ul className="space-y-2">
        {alivePlayers
          .filter((p) => p.user_id !== currentUserId)
          .map((p) => {
            const isVoted = myVote === p.id;
            return (
              <li key={p.id}>
                <button
                  className={[
                    "w-full flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors",
                    isVoted
                      ? "border-destructive bg-destructive/10 text-destructive"
                      : myVote
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:bg-muted cursor-pointer",
                  ].join(" ")}
                  disabled={!!myVote || voting}
                  onClick={() => handleVote(p.id)}
                >
                  <span className="font-medium">{p.nickname}</span>
                  {isVoted && (
                    <span className="flex items-center gap-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Ovoz berdingiz
                    </span>
                  )}
                </button>
              </li>
            );
          })}
      </ul>

      {/* Own vote status */}
      {!myVote && (
        <p className="text-center text-xs text-muted-foreground">
          Kimni bunkerdan tashqarida qoldirishni xohlaysiz?
        </p>
      )}

      {/* Host tally button */}
      {isHost && (
        <Button
          variant="destructive"
          className="w-full"
          disabled={tallying || voteCount === 0}
          onClick={handleTally}
        >
          {tallying ? "Hisoblanmoqda..." : `Ovozlarni yakunlash (${voteCount}/${totalVoters})`}
        </Button>
      )}

      {!isHost && myVote && (
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Ovoz berildi</Badge>
          <span>Host ovozlarni yakunlashini kuting</span>
        </div>
      )}
    </div>
  );
}

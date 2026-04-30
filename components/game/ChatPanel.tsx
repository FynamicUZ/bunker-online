"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Eye } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions";

interface Message {
  id: string;
  content: string;
  type: string;
  created_at: string;
  player_id: string | null;
  players: { nickname: string; is_alive: boolean } | null;
}

interface ChatPanelProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  myPlayerId: string;
  isAlive: boolean;
  currentUserId: string;
}

export default function ChatPanel({
  open,
  onClose,
  roomId,
  myPlayerId,
  isAlive,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState<"living" | "ghost">(() => isAlive ? "living" : "ghost");
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const prevAliveRef = useRef(isAlive);

  // Single effect: subscribe FIRST, then load initial messages, dedupe by id
  useEffect(() => {
    if (!open) return;
    let isMounted = true;
    const supabase = createClient();

    const appendDedup = (incoming: Message) => {
      setMessages((prev) =>
        prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
      );
    };

    const channel = supabase
      .channel(`chat:${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        async (payload) => {
          if (!isMounted) return;
          const raw = payload.new as { id: string; content: string; type: string; created_at: string; player_id: string | null };
          if (raw.player_id) {
            const { data: player } = await supabase
              .from("players")
              .select("nickname, is_alive")
              .eq("id", raw.player_id)
              .maybeSingle();
            if (!isMounted) return;
            appendDedup({ ...raw, players: player ?? null });
          } else {
            appendDedup({ ...raw, players: null });
          }
        }
      )
      .subscribe();

    (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, content, type, created_at, player_id, players(nickname, is_alive)")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .limit(200);
      if (!isMounted) return;
      if (data) {
        const normalized = data.map((m) => ({
          ...m,
          players: Array.isArray(m.players) ? (m.players[0] ?? null) : m.players,
        })) as Message[];
        setMessages((prev) => {
          // Merge: keep any realtime messages already received, then add initial ones not yet present
          const seen = new Set(prev.map((m) => m.id));
          const merged = [...prev];
          for (const m of normalized) if (!seen.has(m.id)) merged.push(m);
          merged.sort((a, b) => a.created_at.localeCompare(b.created_at));
          return merged;
        });
      }
    })();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [open, roomId]);

  // Auto-scroll only when user is already near the bottom
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
    if (distanceFromBottom < 80) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, tab]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  // When eliminated mid-game, switch to ghost tab
  useEffect(() => {
    if (prevAliveRef.current && !isAlive) setTab("ghost");
    prevAliveRef.current = isAlive;
  }, [isAlive]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setSending(true);
    const msgType = isAlive ? "chat" : "ghost";
    const { error } = await sendMessage(roomId, myPlayerId, text, msgType);
    if (error) setInput(text);
    setSending(false);
  }, [input, sending, isAlive, roomId, myPlayerId]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const livingMessages = messages.filter((m) => m.type === "chat" || m.type === "system" || m.type === "event");
  const ghostMessages = messages.filter((m) => m.type === "ghost");
  const visibleMessages = tab === "living" ? livingMessages : ghostMessages;

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="chat"
          className="fixed bottom-14 right-4 z-40 flex w-[300px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-border bg-[oklch(0.14_0.007_55)] shadow-2xl overflow-hidden"
          style={{ height: "420px" }}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <div className="flex gap-1">
              <button
                onClick={() => setTab("living")}
                className={[
                  "rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                  tab === "living"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                Chat
              </button>
              <button
                onClick={() => setTab("ghost")}
                className={[
                  "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                  tab === "ghost"
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                <Eye className="h-3 w-3" />
                Ruhlar
              </button>
            </div>
            <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Eliminated read-only notice */}
          {!isAlive && tab === "living" && (
            <div className="flex items-center gap-1.5 border-b border-border/30 bg-muted/30 px-3 py-1.5">
              <Eye className="h-3 w-3 text-muted-foreground shrink-0" />
              <p className="text-[10px] text-muted-foreground">Faqat o&apos;qish rejimi</p>
            </div>
          )}

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {visibleMessages.length === 0 && (
              <p className="text-center text-[11px] text-muted-foreground/50 mt-8">
                {tab === "ghost" ? "Ruhlar jim..." : "Hali xabar yo'q"}
              </p>
            )}
            {visibleMessages.map((msg) => {
              const isSystem = msg.type === "system" || msg.type === "event";
              const isOwn = msg.player_id === myPlayerId;

              if (isSystem) {
                return (
                  <p key={msg.id} className="text-center text-[10px] text-muted-foreground/60 italic">
                    {msg.content}
                  </p>
                );
              }

              return (
                <div key={msg.id} className={["flex flex-col gap-0.5", isOwn ? "items-end" : "items-start"].join(" ")}>
                  {!isOwn && (
                    <span className={["text-[10px] font-semibold", tab === "ghost" ? "text-muted-foreground" : "text-[var(--bunker-amber)]"].join(" ")}>
                      {msg.players?.nickname ?? "?"}
                    </span>
                  )}
                  <div className={[
                    "max-w-[220px] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed",
                    isOwn
                      ? "bg-[var(--bunker-rust)]/80 text-white"
                      : tab === "ghost"
                        ? "bg-muted/50 text-muted-foreground"
                        : "bg-muted text-foreground",
                  ].join(" ")}>
                    {msg.content}
                  </div>
                  <span className="text-[9px] text-muted-foreground/40">{formatTime(msg.created_at)}</span>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input — alive players write to living chat, dead players write to ghost chat */}
          {((isAlive && tab === "living") || (!isAlive && tab === "ghost")) && (
            <div className="flex items-center gap-2 border-t border-border/40 px-3 py-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={tab === "ghost" ? "Ruhlar gurungi..." : "Xabar yozing..."}
                maxLength={280}
                className="flex-1 rounded-md bg-muted/50 px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/50 focus:ring-1 focus:ring-ring"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className="rounded-md bg-[var(--bunker-rust)] p-1.5 text-white transition-opacity disabled:opacity-40 hover:opacity-90"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

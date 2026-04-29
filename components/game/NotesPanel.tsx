"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, StickyNote } from "lucide-react";

interface NotesPanelProps {
  open: boolean;
  onClose: () => void;
  roomCode: string;
}

const DEBOUNCE_MS = 600;

export default function NotesPanel({ open, onClose, roomCode }: NotesPanelProps) {
  const key = `bunker:notes:${roomCode}`;
  const [text, setText] = useState(() =>
    typeof window !== "undefined" ? (localStorage.getItem(key) ?? "") : ""
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on open
  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [open]);

  const handleChange = (value: string) => {
    setText(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      localStorage.setItem(key, value);
    }, DEBOUNCE_MS);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="notes"
          className="fixed bottom-14 left-4 z-40 flex w-[280px] max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-border bg-[oklch(0.14_0.007_55)] shadow-2xl overflow-hidden"
          style={{ height: "320px" }}
          initial={{ opacity: 0, y: 16, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 16, scale: 0.96 }}
          transition={{ duration: 0.18 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <div className="flex items-center gap-1.5">
              <StickyNote className="h-3.5 w-3.5 text-[var(--bunker-amber)]" />
              <span className="text-[11px] font-semibold">Yozuvlarim</span>
              <span className="text-[9px] text-muted-foreground/50">(shaxsiy)</span>
            </div>
            <button onClick={onClose} className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="O'yinchilar haqida yozib oling..."
            className="flex-1 resize-none bg-transparent px-3 py-2 text-xs leading-relaxed text-foreground placeholder:text-muted-foreground/40 outline-none"
          />

          <div className="border-t border-border/30 px-3 py-1">
            <p className="text-[9px] text-muted-foreground/40">Avtomatik saqlanadi</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

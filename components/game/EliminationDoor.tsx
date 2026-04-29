"use client";

import { motion, AnimatePresence } from "framer-motion";

interface EliminationDoorProps {
  eliminatedName: string | null;
}

export default function EliminationDoor({ eliminatedName }: EliminationDoorProps) {
  return (
    <div className="relative">
      {/* Bunker door SVG — right-back position */}
      <svg
        width="56"
        height="72"
        viewBox="0 0 56 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="opacity-70"
      >
        {/* Door frame */}
        <rect x="2" y="2" width="52" height="68" rx="4" stroke="oklch(0.45 0.04 55)" strokeWidth="3" fill="oklch(0.14 0.006 55)" />
        {/* Door panel lines */}
        <rect x="8" y="8" width="40" height="28" rx="2" stroke="oklch(0.35 0.03 55)" strokeWidth="1.5" fill="none" />
        <rect x="8" y="42" width="40" height="22" rx="2" stroke="oklch(0.35 0.03 55)" strokeWidth="1.5" fill="none" />
        {/* Handle */}
        <circle cx="40" cy="38" r="3" fill="oklch(0.58 0.18 38)" />
        {/* Hinges */}
        <rect x="4" y="10" width="5" height="8" rx="1" fill="oklch(0.40 0.04 55)" />
        <rect x="4" y="54" width="5" height="8" rx="1" fill="oklch(0.40 0.04 55)" />
        {/* Warning stripe at bottom */}
        <rect x="2" y="62" width="52" height="8" rx="2" fill="oklch(0.25 0.06 50)" />
        <line x1="12" y1="62" x2="2" y2="70" stroke="oklch(0.58 0.18 38)" strokeWidth="1.5" />
        <line x1="26" y1="62" x2="16" y2="70" stroke="oklch(0.58 0.18 38)" strokeWidth="1.5" />
        <line x1="40" y1="62" x2="30" y2="70" stroke="oklch(0.58 0.18 38)" strokeWidth="1.5" />
        <line x1="54" y1="62" x2="44" y2="70" stroke="oklch(0.58 0.18 38)" strokeWidth="1.5" />
      </svg>

      {/* "Chiqib ketdi" toast */}
      <AnimatePresence>
        {eliminatedName && (
          <motion.div
            key={eliminatedName}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-destructive px-2 py-0.5 text-[10px] font-bold text-white shadow"
          >
            {eliminatedName} ✕
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

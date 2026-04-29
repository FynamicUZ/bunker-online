"use client";

import { useEffect, useState } from "react";

interface TurnTimerProps {
  turnStartedAt: string | null;
  totalSeconds: number;
  onExpire: () => void;
  label?: string;
}

export default function TurnTimer({ turnStartedAt, totalSeconds, onExpire, label }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(totalSeconds);

  useEffect(() => {
    if (!turnStartedAt) return;

    const tick = () => {
      const elapsed = (Date.now() - new Date(turnStartedAt).getTime()) / 1000;
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);
      if (left <= 0) onExpire();
    };

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [turnStartedAt, totalSeconds, onExpire]);

  const pct = (remaining / totalSeconds) * 100;
  const color =
    pct > 50
      ? "oklch(0.72 0.15 55)"   // amber
      : pct > 25
        ? "oklch(0.65 0.18 50)"  // orange
        : "oklch(0.62 0.22 28)"; // red

  const r = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
        <circle cx="26" cy="26" r={r} stroke="oklch(1 0 0 / 8%)" strokeWidth="3" fill="none" />
        <circle
          cx="26" cy="26" r={r}
          stroke={color}
          strokeWidth="3"
          fill="none"
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s linear, stroke 0.3s" }}
        />
      </svg>
      <span className="text-sm font-black tabular-nums" style={{ color }}>
        {Math.ceil(remaining)}s
      </span>
      {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
    </div>
  );
}

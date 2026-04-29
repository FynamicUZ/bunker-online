-- Migration 006: add turn-order and AFK-bot columns
-- Apply in Supabase Dashboard → SQL Editor

-- Players: reveal order + bot flag
alter table players
  add column if not exists reveal_order   int,
  add column if not exists is_bot         boolean not null default false;

-- Rooms: turn tracking
alter table rooms
  add column if not exists current_turn_index int         not null default 0,
  add column if not exists turn_started_at    timestamptz,
  add column if not exists turn_warning_at    timestamptz,
  add column if not exists turn_grace_at      timestamptz;

-- Host can update rooms (already covered by existing policy),
-- but players need to call confirmStillHere which updates rooms.turn_grace_at.
-- That action verifies auth server-side so no extra RLS needed.

-- Adds per-round field selection (all players reveal the same card type each round)
-- and host-configurable turn duration
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS current_round_field text,
  ADD COLUMN IF NOT EXISTS turn_duration int NOT NULL DEFAULT 25;

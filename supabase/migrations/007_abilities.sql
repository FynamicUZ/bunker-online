-- Migration 007: special ability system
-- Apply in Supabase Dashboard → SQL Editor

-- Add ability columns to players
alter table players
  add column if not exists special_ability_id   text,
  add column if not exists special_ability_used  boolean not null default false;

-- Ability uses table
create table if not exists ability_uses (
  id          uuid        primary key default gen_random_uuid(),
  room_id     uuid        not null references rooms(id) on delete cascade,
  player_id   uuid        not null references players(id) on delete cascade,
  ability_id  text        not null,
  round       int         not null,
  target_id   uuid        references players(id) on delete set null,
  payload     jsonb       not null default '{}',
  created_at  timestamptz not null default now()
);

create index if not exists idx_ability_uses_room_round on ability_uses(room_id, round);
create index if not exists idx_ability_uses_player     on ability_uses(player_id);

-- RLS
alter table ability_uses enable row level security;

-- Room members can see ability uses in their room
create policy "ability_uses: xona a'zosi ko'ra oladi" on ability_uses
  for select using (
    exists (
      select 1 from players
      where players.room_id = ability_uses.room_id
        and players.user_id = auth.uid()
    )
  );

-- Only alive players can use abilities (one per player enforced server-side)
create policy "ability_uses: o'yinchi foydalanishi mumkin" on ability_uses
  for insert with check (
    exists (
      select 1 from players
      where players.id = ability_uses.player_id
        and players.user_id = auth.uid()
        and players.is_alive = true
        and players.special_ability_used = false
    )
  );

-- Reset ability columns on game reset
-- (handled in resetRoom server action)

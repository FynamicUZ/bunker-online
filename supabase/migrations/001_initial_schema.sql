-- ============================================================
-- Bunker Online — initial schema
-- Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- ------------------------------------------------------------
-- ROOMS
-- ------------------------------------------------------------
create table if not exists rooms (
  id               uuid        primary key default gen_random_uuid(),
  code             text        unique not null,
  host_id          uuid        not null,           -- auth.uid() of the creator
  status           text        not null default 'lobby'
                               check (status in ('lobby','playing','finished')),
  max_players      int         not null default 10,
  bunker_capacity  int         not null default 5,
  current_round    int         not null default 0,
  current_phase    text        check (current_phase in ('reveal','discussion','voting')),
  scenario_id      text,
  settings         jsonb       not null default '{}',
  created_at       timestamptz not null default now(),
  started_at       timestamptz,
  finished_at      timestamptz
);

create index if not exists idx_rooms_code   on rooms(code);
create index if not exists idx_rooms_status on rooms(status);

-- ------------------------------------------------------------
-- PLAYERS
-- ------------------------------------------------------------
create table if not exists players (
  id               uuid        primary key default gen_random_uuid(),
  room_id          uuid        not null references rooms(id) on delete cascade,
  nickname         text        not null,
  user_id          uuid        not null,           -- auth.uid()
  is_host          boolean     not null default false,
  is_alive         boolean     not null default true,
  joined_at        timestamptz not null default now(),
  character        jsonb,
  revealed_fields  text[]      not null default '{}',
  unique(room_id, nickname),
  unique(room_id, user_id)
);

create index if not exists idx_players_room    on players(room_id);
create index if not exists idx_players_user    on players(user_id);

-- ------------------------------------------------------------
-- VOTES
-- ------------------------------------------------------------
create table if not exists votes (
  id          uuid        primary key default gen_random_uuid(),
  room_id     uuid        not null references rooms(id) on delete cascade,
  round       int         not null,
  voter_id    uuid        not null references players(id) on delete cascade,
  target_id   uuid        not null references players(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique(room_id, round, voter_id)
);

create index if not exists idx_votes_room_round on votes(room_id, round);

-- ------------------------------------------------------------
-- MESSAGES
-- ------------------------------------------------------------
create table if not exists messages (
  id          uuid        primary key default gen_random_uuid(),
  room_id     uuid        not null references rooms(id) on delete cascade,
  player_id   uuid        references players(id) on delete set null,
  content     text        not null,
  type        text        not null default 'chat'
                          check (type in ('chat','system','event')),
  created_at  timestamptz not null default now()
);

create index if not exists idx_messages_room on messages(room_id, created_at);

-- ------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table rooms    enable row level security;
alter table players  enable row level security;
alter table votes    enable row level security;
alter table messages enable row level security;

-- ROOMS policies
create policy "rooms: xona a'zosi ko'ra oladi" on rooms
  for select using (
    exists (
      select 1 from players
      where players.room_id = rooms.id
        and players.user_id = auth.uid()
    )
  );

create policy "rooms: har kim yarata oladi" on rooms
  for insert with check (host_id = auth.uid());

create policy "rooms: faqat host o'zgartira oladi" on rooms
  for update using (
    exists (
      select 1 from players
      where players.room_id = rooms.id
        and players.user_id = auth.uid()
        and players.is_host = true
    )
  );

-- PLAYERS policies
create policy "players: bir xona a'zolari ko'ra oladi" on players
  for select using (
    exists (
      select 1 from players p2
      where p2.room_id = players.room_id
        and p2.user_id = auth.uid()
    )
  );

create policy "players: har kim qo'shila oladi" on players
  for insert with check (user_id = auth.uid());

create policy "players: faqat o'zi o'zgartira oladi" on players
  for update using (user_id = auth.uid());

-- VOTES policies
create policy "votes: xona a'zosi ko'ra oladi" on votes
  for select using (
    exists (
      select 1 from players
      where players.room_id = votes.room_id
        and players.user_id = auth.uid()
    )
  );

create policy "votes: tirik a'zo ovoz beradi" on votes
  for insert with check (
    exists (
      select 1 from players
      where players.id = votes.voter_id
        and players.user_id = auth.uid()
        and players.is_alive = true
    )
  );

-- MESSAGES policies
create policy "messages: xona a'zosi ko'ra oladi" on messages
  for select using (
    exists (
      select 1 from players
      where players.room_id = messages.room_id
        and players.user_id = auth.uid()
    )
  );

create policy "messages: xona a'zosi yoza oladi" on messages
  for insert with check (
    exists (
      select 1 from players
      where players.room_id = messages.room_id
        and players.user_id = auth.uid()
    )
  );

-- ============================================================
-- Run this once in Supabase Dashboard → SQL Editor.
-- It's fully idempotent — safe to re-run if anything errors.
--
-- Brings an existing project up to the schema the current app expects:
--   • rooms / players SELECT open to everyone (lobby join needs this)
--   • host can update any player (vote tally needs this)
--   • DELETE policies for leave-room and play-again
-- ============================================================

-- rooms SELECT
drop policy if exists "rooms: xona a'zosi ko'ra oladi" on rooms;
drop policy if exists "rooms: hammaga ko'rinadi" on rooms;
create policy "rooms: hammaga ko'rinadi" on rooms
  for select using (true);

-- players SELECT
drop policy if exists "players: bir xona a'zolari ko'ra oladi" on players;
drop policy if exists "players: hammaga ko'rinadi" on players;
create policy "players: hammaga ko'rinadi" on players
  for select using (true);

-- players UPDATE — host can update any player in their room
drop policy if exists "players: faqat o'zi o'zgartira oladi" on players;
drop policy if exists "players: o'zi yoki host o'zgartira oladi" on players;
create policy "players: o'zi yoki host o'zgartira oladi" on players
  for update using (
    user_id = auth.uid()
    or exists (
      select 1 from players p_host
      where p_host.room_id = players.room_id
        and p_host.user_id = auth.uid()
        and p_host.is_host = true
    )
  );

-- players DELETE — leave lobby
drop policy if exists "players: o'zini chiqara oladi" on players;
create policy "players: o'zini chiqara oladi" on players
  for delete using (user_id = auth.uid());

-- rooms DELETE — host closes room
drop policy if exists "rooms: host yopa oladi" on rooms;
create policy "rooms: host yopa oladi" on rooms
  for delete using (host_id = auth.uid());

-- votes DELETE — host wipes votes on "Yana o'ynash"
drop policy if exists "votes: host tozalay oladi" on votes;
create policy "votes: host tozalay oladi" on votes
  for delete using (
    exists (
      select 1 from rooms
      where rooms.id = votes.room_id
        and rooms.host_id = auth.uid()
    )
  );

-- Make sure realtime publication includes the tables we subscribe to.
-- These will error if a table is already in the publication; that's harmless.
do $$
begin
  begin alter publication supabase_realtime add table rooms;   exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table players; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table votes;   exception when duplicate_object then null; end;
end $$;

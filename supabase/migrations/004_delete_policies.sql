-- Allow players to leave a lobby and hosts to close their own room.
-- Without these DELETE policies RLS denies the deletes silently.
-- Run in Supabase Dashboard → SQL Editor.

-- A player can remove their own row from a room.
drop policy if exists "players: o'zini chiqara oladi" on players;
create policy "players: o'zini chiqara oladi" on players
  for delete using (user_id = auth.uid());

-- The host can delete the room they created (cascades to players + votes + messages).
drop policy if exists "rooms: host yopa oladi" on rooms;
create policy "rooms: host yopa oladi" on rooms
  for delete using (host_id = auth.uid());

-- Host needs to wipe votes when restarting a finished game ("Yana o'ynash").
drop policy if exists "votes: host tozalay oladi" on votes;
create policy "votes: host tozalay oladi" on votes
  for delete using (
    exists (
      select 1 from rooms
      where rooms.id = votes.room_id
        and rooms.host_id = auth.uid()
    )
  );

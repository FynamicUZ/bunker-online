-- Allow the room host to update any player in their room.
-- Needed so the host can set is_alive = false after vote tally.
-- Run in Supabase Dashboard → SQL Editor.

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

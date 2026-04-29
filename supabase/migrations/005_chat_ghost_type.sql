-- Migration 005: extend messages.type to include 'ghost' for eliminated-player chat
-- Apply in Supabase Dashboard → SQL Editor

-- Drop the old check constraint and add the updated one
alter table messages
  drop constraint if exists messages_type_check;

alter table messages
  add constraint messages_type_check
  check (type in ('chat', 'ghost', 'system', 'event'));

-- Allow players in the room to read ghost messages too (they're filtered client-side)
-- Existing "messages: xona a'zosi ko'ra oladi" policy already covers this via room_id check.

-- Living players can insert chat; eliminated players can insert ghost
drop policy if exists "messages: xona a'zosi yoza oladi" on messages;

create policy "messages: xona a'zosi yoza oladi" on messages
  for insert with check (
    exists (
      select 1 from players
      where players.id = messages.player_id
        and players.room_id = messages.room_id
        and players.user_id = auth.uid()
        -- living → chat/system/event only; eliminated → ghost only
        and (
          (players.is_alive = true  and messages.type in ('chat', 'system', 'event'))
          or
          (players.is_alive = false and messages.type = 'ghost')
        )
    )
  );

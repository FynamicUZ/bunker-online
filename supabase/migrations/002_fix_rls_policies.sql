-- rooms SELECT policy'ni tuzatish:
-- Xona kodi orqali qo'shiluvchi foydalanuvchilar ham o'qiy olishi kerak.
-- Idempotent: avval barcha eski variantlar o'chiriladi, keyin yangisi yaratiladi.
drop policy if exists "rooms: xona a'zosi ko'ra oladi" on rooms;
drop policy if exists "rooms: hammaga ko'rinadi" on rooms;

create policy "rooms: hammaga ko'rinadi" on rooms
  for select using (true);

-- players SELECT policy'ni ham hammaga ochiq qilish:
-- joinRoom da count tekshiruvi, lobby ko'rinishi va realtime obunalar uchun kerak.
drop policy if exists "players: bir xona a'zolari ko'ra oladi" on players;
drop policy if exists "players: hammaga ko'rinadi" on players;

create policy "players: hammaga ko'rinadi" on players
  for select using (true);

-- rooms INSERT policy ham host_id tekshiruvi bilan to'g'ri ishlaydi
-- (o'zgartirish kerak emas)

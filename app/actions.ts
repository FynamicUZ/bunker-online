import { createClient } from "@/lib/supabase/client";
import { generateCharacters, pickScenario } from "@/lib/game/characterGenerator";
import { randomAbilityId } from "@/lib/game/abilities";
import { applyAbilities } from "@/lib/game/applyAbilities";
import type { CharacterField } from "@/lib/game/types";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(
    { length: 6 },
    () => chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function createRoom(nickname: string): Promise<{ code: string } | { error: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  let code = "";
  for (let i = 0; i < 10; i++) {
    const candidate = generateRoomCode();
    const { data } = await supabase
      .from("rooms")
      .select("id")
      .eq("code", candidate)
      .maybeSingle();
    if (!data) { code = candidate; break; }
  }
  if (!code) return { error: "Xona kodi yaratishda xatolik" };

  const roomId = crypto.randomUUID();

  const { error: roomError } = await supabase.from("rooms").insert({
    id: roomId,
    code,
    host_id: user.id,
    max_players: 10,
    bunker_capacity: 5,
  });
  if (roomError) return { error: "Xona yaratishda xatolik: " + roomError.message };

  const { error: playerError } = await supabase.from("players").insert({
    room_id: roomId,
    nickname,
    user_id: user.id,
    is_host: true,
  });
  if (playerError) {
    await supabase.from("rooms").delete().eq("id", roomId);
    return { error: "O'yinchini qo'shishda xatolik: " + playerError.message };
  }

  return { code };
}

export async function joinRoom(nickname: string, roomCode: string): Promise<{ code: string } | { error: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const code = roomCode.toUpperCase();

  const { data: room } = await supabase
    .from("rooms")
    .select("id, status, max_players")
    .eq("code", code)
    .maybeSingle();

  if (!room) return { error: "Xona topilmadi. Kodni tekshiring" };
  if (room.status !== "lobby") return { error: "Bu xonada o'yin boshlangan" };

  const { count } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", room.id);
  if ((count ?? 0) >= room.max_players) return { error: "Xona to'lgan" };

  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return { code };

  const { error: playerError } = await supabase.from("players").insert({
    room_id: room.id,
    nickname,
    user_id: user.id,
    is_host: false,
  });
  if (playerError) {
    if (playerError.code === "23505") return { error: `"${nickname}" nomi bu xonada band` };
    return { error: "Xonaga qo'shilishda xatolik: " + playerError.message };
  }

  return { code };
}

// ── Turn helpers ─────────────────────────────────────────────────────────────

export async function startTurn(roomId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { error } = await supabase
    .from("rooms")
    .update({
      turn_started_at: new Date().toISOString(),
      turn_warning_at: null,
      turn_grace_at: null,
    })
    .eq("id", roomId);

  if (error) return { error: "Navbatni boshlashda xatolik" };
  return {};
}

export async function confirmStillHere(roomId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { error } = await supabase
    .from("rooms")
    .update({ turn_grace_at: new Date().toISOString() })
    .eq("id", roomId);

  if (error) return { error: "Javob yuborishda xatolik" };
  return {};
}

export async function triggerAfkAdvance(
  roomId: string,
  playerId: string
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  // Mark as bot and auto-reveal a random hidden card
  const { data: player } = await supabase
    .from("players")
    .select("revealed_fields")
    .eq("id", playerId)
    .single();

  if (!player) return { error: "O'yinchi topilmadi" };

  const ALL_FIELDS: CharacterField[] = ["biology", "profession", "health", "hobby", "trait", "extra"];
  const hidden = ALL_FIELDS.filter((f) => !(player.revealed_fields as CharacterField[]).includes(f));
  const toReveal = hidden[Math.floor(Math.random() * hidden.length)];

  if (toReveal) {
    await supabase
      .from("players")
      .update({
        is_bot: true,
        revealed_fields: [...(player.revealed_fields as CharacterField[]), toReveal],
      })
      .eq("id", playerId);
  }

  // Advance turn index
  const { data: room } = await supabase
    .from("rooms")
    .select("current_turn_index")
    .eq("id", roomId)
    .single();

  if (room) {
    await supabase
      .from("rooms")
      .update({
        current_turn_index: (room.current_turn_index ?? 0) + 1,
        turn_started_at: new Date().toISOString(),
        turn_warning_at: null,
        turn_grace_at: null,
      })
      .eq("id", roomId);
  }

  return {};
}

// ─────────────────────────────────────────────────────────────────────────────

export async function startGame(roomId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { data: players, error: playersErr } = await supabase
    .from("players")
    .select("id")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (playersErr || !players?.length) return { error: "O'yinchilar topilmadi" };

  const characters = generateCharacters(players.length);
  const scenario = pickScenario();

  // Shuffle reveal order
  const shuffledIndices = players.map((_, i) => i).sort(() => Math.random() - 0.5);

  const updates = players.map((p, i) =>
    supabase
      .from("players")
      .update({
        character: characters[i],
        revealed_fields: [],
        reveal_order: shuffledIndices[i],
        is_bot: false,
        special_ability_id: randomAbilityId(),
        special_ability_used: false,
      })
      .eq("id", p.id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: "Karakterlarni saqlashda xatolik" };

  // Bunker capacity: floor(N/2). Always leaves room for at least one elimination
  // round and prevents the "game ends immediately" bug when capacity ≥ players.
  const bunkerCapacity = Math.max(1, Math.floor(players.length / 2));

  const { error: roomErr } = await supabase
    .from("rooms")
    .update({
      status: "playing",
      scenario_id: scenario.id,
      started_at: new Date().toISOString(),
      current_round: 1,
      bunker_capacity: bunkerCapacity,
      current_turn_index: 0,
      turn_started_at: new Date().toISOString(),
      turn_warning_at: null,
      turn_grace_at: null,
    })
    .eq("id", roomId);

  if (roomErr) return { error: "O'yinni boshlashda xatolik" };

  return {};
}

export async function leaveRoom(roomId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  // Only allow leaving if room is still in lobby; mid-game leaves would
  // unbalance voting/elimination logic.
  const { data: room } = await supabase
    .from("rooms")
    .select("status, host_id")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Xona topilmadi" };
  if (room.status !== "lobby") {
    return { error: "O'yin boshlangandan keyin chiqib bo'lmaydi" };
  }

  // If host leaves, delete the room entirely (cascades to players + votes).
  if (room.host_id === user.id) {
    const { error } = await supabase.from("rooms").delete().eq("id", roomId);
    if (error) return { error: "Xonani yopishda xatolik" };
    return {};
  }

  const { error } = await supabase
    .from("players")
    .delete()
    .eq("room_id", roomId)
    .eq("user_id", user.id);

  if (error) return { error: "Chiqishda xatolik" };
  return {};
}

export async function revealField(
  playerId: string,
  field: CharacterField
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { data, error: fetchErr } = await supabase
    .from("players")
    .select("revealed_fields, user_id")
    .eq("id", playerId)
    .single();

  if (fetchErr || !data) return { error: "O'yinchi topilmadi" };
  if (data.user_id !== user.id) return { error: "Ruxsat yo'q" };

  const current: CharacterField[] = (data.revealed_fields as CharacterField[]) ?? [];
  if (current.includes(field)) return {};

  const { error } = await supabase
    .from("players")
    .update({ revealed_fields: [...current, field] })
    .eq("id", playerId);

  if (error) return { error: "Maydonni ochishda xatolik" };
  return {};
}

export async function advanceRound(roomId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { data: room } = await supabase
    .from("rooms")
    .select("current_round, host_id")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Xona topilmadi" };
  if (room.host_id !== user.id) return { error: "Faqat host boshqarishi mumkin" };

  const { error } = await supabase
    .from("rooms")
    .update({ current_round: (room.current_round ?? 1) + 1, current_phase: null })
    .eq("id", roomId);

  if (error) return { error: "Bosqichni o'tkazishda xatolik" };
  return {};
}

export async function setPhase(
  roomId: string,
  phase: "voting" | null
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { data: room } = await supabase
    .from("rooms")
    .select("host_id")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Xona topilmadi" };
  if (room.host_id !== user.id) return { error: "Faqat host boshqarishi mumkin" };

  const { error } = await supabase
    .from("rooms")
    .update({ current_phase: phase })
    .eq("id", roomId);

  if (error) return { error: "Bosqichni o'zgartirishda xatolik" };
  return {};
}

export async function castVote(
  roomId: string,
  voterId: string,
  targetId: string,
  round: number
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { error } = await supabase.from("votes").insert({
    room_id: roomId,
    voter_id: voterId,
    target_id: targetId,
    round,
  });

  if (error) {
    if (error.code === "23505") return { error: "Bu bosqichda allaqachon ovoz bergansiz" };
    return { error: "Ovoz berishda xatolik" };
  }
  return {};
}

export async function resetRoom(roomId: string): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { data: room } = await supabase
    .from("rooms")
    .select("host_id, status")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Xona topilmadi" };
  if (room.host_id !== user.id) return { error: "Faqat host qayta boshlashi mumkin" };
  if (room.status !== "finished") return { error: "O'yin hali tugamagan" };

  // Wipe per-game state on players
  const { error: playersErr } = await supabase
    .from("players")
    .update({
      is_alive: true,
      character: null,
      revealed_fields: [],
      reveal_order: null,
      is_bot: false,
      special_ability_id: null,
      special_ability_used: false,
    })
    .eq("room_id", roomId);
  if (playersErr) return { error: "O'yinchilarni yangilashda xatolik" };

  // Drop votes and ability uses from previous game
  const [votesResult, abilitiesResult] = await Promise.all([
    supabase.from("votes").delete().eq("room_id", roomId),
    supabase.from("ability_uses").delete().eq("room_id", roomId),
  ]);
  if (votesResult.error) return { error: "Ovozlarni tozalashda xatolik" };
  if (abilitiesResult.error) return { error: "Imkoniyatlarni tozalashda xatolik" };

  const { error: roomErr } = await supabase
    .from("rooms")
    .update({
      status: "lobby",
      current_round: 0,
      current_phase: null,
      scenario_id: null,
      started_at: null,
      finished_at: null,
      current_turn_index: 0,
      turn_started_at: null,
      turn_warning_at: null,
      turn_grace_at: null,
    })
    .eq("id", roomId);

  if (roomErr) return { error: "Xonani qayta tiklashda xatolik" };
  return {};
}

export async function sendMessage(
  roomId: string,
  playerId: string,
  content: string,
  type: "chat" | "ghost" | "system" | "event" = "chat"
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const text = content.trim().slice(0, 280);
  if (!text) return { error: "Xabar bo'sh bo'lmasin" };

  const { error } = await supabase.from("messages").insert({
    room_id: roomId,
    player_id: playerId,
    content: text,
    type,
  });

  if (error) return { error: "Xabar yuborishda xatolik" };
  return {};
}

export async function activateAbility(
  roomId: string,
  abilityId: string,
  targetId: string | null,
  payload: Record<string, unknown> = {}
): Promise<{ error?: string }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  const { data: me } = await supabase
    .from("players")
    .select("id, is_alive, special_ability_id, special_ability_used, room_id")
    .eq("room_id", roomId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!me) return { error: "O'yinchi topilmadi" };
  if (!me.is_alive) return { error: "Faqat tirik o'yinchilar foydalana oladi" };
  if (me.special_ability_used) return { error: "Imkoniyatingizni allaqachon ishlatdingiz" };
  if (me.special_ability_id !== abilityId) return { error: "Bu sizning imkoniyatingiz emas" };

  const { data: room } = await supabase
    .from("rooms")
    .select("current_round")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Xona topilmadi" };

  const { error: insertErr } = await supabase.from("ability_uses").insert({
    room_id: roomId,
    player_id: me.id,
    ability_id: abilityId,
    round: room.current_round,
    target_id: targetId,
    payload,
  });

  if (insertErr) return { error: "Imkoniyatni qo'llashda xatolik: " + insertErr.message };

  await supabase
    .from("players")
    .update({ special_ability_used: true })
    .eq("id", me.id);

  return {};
}

export async function tallyVotes(
  roomId: string,
  round: number
): Promise<{ error?: string; eliminatedName?: string; gameOver?: boolean }> {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Autentifikatsiya xatosi" };

  // Verify host
  const { data: room } = await supabase
    .from("rooms")
    .select("host_id, bunker_capacity, current_round")
    .eq("id", roomId)
    .single();

  if (!room) return { error: "Xona topilmadi" };
  if (room.host_id !== user.id) return { error: "Faqat host boshqarishi mumkin" };

  // Fetch votes for this round
  const { data: votes } = await supabase
    .from("votes")
    .select("voter_id, target_id")
    .eq("room_id", roomId)
    .eq("round", round);

  if (!votes?.length) return { error: "Hech kim ovoz bermagan" };

  // Fetch ability uses for this round
  const { data: abilityUses } = await supabase
    .from("ability_uses")
    .select("player_id, ability_id, target_id, payload")
    .eq("room_id", roomId)
    .eq("round", round);

  // Fetch alive players for disperse/alliance resolution
  const { data: alivePlayers } = await supabase
    .from("players")
    .select("id, is_alive")
    .eq("room_id", roomId)
    .eq("is_alive", true);

  const result = applyAbilities(
    votes.map((v) => ({ voter_id: v.voter_id, target_id: v.target_id })),
    (abilityUses ?? []).map((u) => ({
      player_id: u.player_id,
      ability_id: u.ability_id,
      target_id: u.target_id,
      payload: (u.payload as Record<string, unknown>) ?? {},
    })),
    (alivePlayers ?? []).map((p) => ({ id: p.id, is_alive: p.is_alive }))
  );

  if (result.noElimination) {
    await supabase
      .from("rooms")
      .update({ current_round: round + 1, current_phase: null })
      .eq("id", roomId);
    return { eliminatedName: undefined, gameOver: false };
  }

  const eliminatedId = result.eliminatedId;
  if (!eliminatedId) return { error: "Ovozlarni hisoblashda xatolik" };

  // Eliminate the player
  const { error: elimErr } = await supabase
    .from("players")
    .update({ is_alive: false })
    .eq("id", eliminatedId);

  if (elimErr) return { error: "O'yinchini chiqarishda xatolik: " + elimErr.message };

  // Get eliminated player's name + count remaining alive
  const { data: eliminated } = await supabase
    .from("players")
    .select("nickname")
    .eq("id", eliminatedId)
    .single();

  const { count: aliveCount } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_alive", true);

  const alive = aliveCount ?? 0;
  const gameOver = alive <= room.bunker_capacity;

  if (gameOver) {
    await supabase
      .from("rooms")
      .update({ status: "finished", finished_at: new Date().toISOString(), current_phase: null })
      .eq("id", roomId);
  } else {
    await supabase
      .from("rooms")
      .update({ current_round: round + 1, current_phase: null })
      .eq("id", roomId);
  }

  return { eliminatedName: eliminated?.nickname, gameOver };
}

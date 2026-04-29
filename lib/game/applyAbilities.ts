/**
 * applyAbilities — deterministic vote resolution with special ability effects.
 *
 * Resolution order (each step mutates a working tally map):
 *  1. slander       — add extra system votes
 *  2. double_vote   — double the voter's contribution
 *  3. veto          — remove targeted voter's votes
 *  4. vote_redirect — re-point incoming votes to chosen target
 *  5. reflect       — redirect incoming votes back to top voter
 *  6. disperse      — spread incoming votes across alive players
 *  7. shield        — halve incoming votes (round up)
 *  8. Tally totals
 *  9. immunity / last_chance / alliance — affect elimination decision
 */

interface VoteRecord {
  voter_id: string;
  target_id: string;
  weight?: number;
}

interface AbilityUseRecord {
  player_id: string;
  ability_id: string;
  target_id: string | null;
  payload: Record<string, unknown>;
}

interface PlayerInfo {
  id: string;
  is_alive: boolean;
}

export interface TallyResult {
  eliminatedId: string | null;
  noElimination: boolean;
  tally: Record<string, number>;
}

export function applyAbilities(
  rawVotes: VoteRecord[],
  abilityUses: AbilityUseRecord[],
  alivePlayers: PlayerInfo[]
): TallyResult {
  const aliveIds = new Set(alivePlayers.map((p) => p.id));

  // Working vote list with weights
  let votes: { voter: string; target: string; weight: number }[] = rawVotes.map((v) => ({
    voter: v.voter_id,
    target: v.target_id,
    weight: 1,
  }));

  const byAbility = (id: string) => abilityUses.filter((u) => u.ability_id === id);

  // 1. slander — add 1 system vote against target
  for (const use of byAbility("slander")) {
    if (use.target_id && aliveIds.has(use.target_id)) {
      votes.push({ voter: `system:${use.player_id}`, target: use.target_id, weight: 1 });
    }
  }

  // 2. double_vote — find voter and double their weight
  for (const use of byAbility("double_vote")) {
    votes = votes.map((v) => (v.voter === use.player_id ? { ...v, weight: v.weight * 2 } : v));
  }

  // 3. veto — remove one voter's votes
  const vetoedVoters = new Set(byAbility("veto").map((u) => u.target_id).filter(Boolean) as string[]);
  votes = votes.filter((v) => !vetoedVoters.has(v.voter));

  // 4. vote_redirect — all votes against activator go to their chosen target
  for (const use of byAbility("vote_redirect")) {
    if (!use.target_id || !aliveIds.has(use.target_id)) continue;
    votes = votes.map((v) =>
      v.target === use.player_id ? { ...v, target: use.target_id! } : v
    );
  }

  // 5. reflect — votes against activator go to whoever voted them most
  for (const use of byAbility("reflect")) {
    const incomingVoters = votes.filter((v) => v.target === use.player_id);
    if (!incomingVoters.length) continue;
    const topVoter = incomingVoters.reduce((a, b) => (a.weight >= b.weight ? a : b)).voter;
    votes = votes.map((v) =>
      v.target === use.player_id ? { ...v, target: topVoter } : v
    );
  }

  // 6. disperse — votes against activator spread randomly to other alive players
  for (const use of byAbility("disperse")) {
    const others = alivePlayers.filter((p) => p.id !== use.player_id).map((p) => p.id);
    if (!others.length) continue;
    votes = votes.map((v) => {
      if (v.target !== use.player_id) return v;
      const rand = others[Math.floor(Math.random() * others.length)]!;
      return { ...v, target: rand };
    });
  }

  // 7. shield — halve incoming votes (round up)
  const shieldUsers = new Set(byAbility("shield").map((u) => u.player_id));
  votes = votes.map((v) =>
    shieldUsers.has(v.target) ? { ...v, weight: Math.ceil(v.weight / 2) } : v
  );

  // 8. Tally
  const tally: Record<string, number> = {};
  for (const v of votes) {
    tally[v.target] = (tally[v.target] ?? 0) + v.weight;
  }

  if (!Object.keys(tally).length) {
    return { eliminatedId: null, noElimination: false, tally };
  }

  const sorted = Object.entries(tally).sort((a, b) => b[1] - a[1]);
  const [topId, topScore] = sorted[0]!;
  const [secondId] = sorted[1] ?? [null, 0];

  // 9. immunity — remove from elimination, bump to second
  const immunePlayers = new Set(byAbility("immunity").map((u) => u.player_id));
  if (immunePlayers.has(topId)) {
    if (secondId) return { eliminatedId: secondId, noElimination: false, tally };
    return { eliminatedId: null, noElimination: true, tally };
  }

  // last_chance — force tie → no elimination
  const lastChancePlayers = new Set(byAbility("last_chance").map((u) => u.player_id));
  if (lastChancePlayers.has(topId) && secondId && tally[secondId] !== topScore) {
    return { eliminatedId: null, noElimination: true, tally };
  }

  // alliance — if ally would be eliminated, redirect to runner-up
  for (const use of byAbility("alliance")) {
    if (use.target_id === topId || use.player_id === topId) {
      if (secondId) return { eliminatedId: secondId, noElimination: false, tally };
    }
  }

  return { eliminatedId: topId, noElimination: false, tally };
}

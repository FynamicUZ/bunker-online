export type AbilityCategory = "defensive" | "aggressive" | "strategic" | "information";
export type AbilityTargetType = "none" | "player" | "player_card" | "own_card";

export interface Ability {
  id: string;
  name: string;
  description: string;
  category: AbilityCategory;
  targetType: AbilityTargetType;
  /** When true, the effect is applied during vote tally. When false, effect is immediate. */
  appliedAtTally: boolean;
}

export const ABILITIES: Ability[] = [
  // ── Defensive (8) ────────────────────────────────────────────────────────
  {
    id: "vote_redirect",
    name: "Ovozni yo'naltirish",
    description: "Bu bosqichda sizga berilgan barcha ovozlar siz tanlagan o'yinchiga o'tadi.",
    category: "defensive",
    targetType: "player",
    appliedAtTally: true,
  },
  {
    id: "veto",
    name: "Veto",
    description: "Bitta o'yinchining bu bosqichdagi ovozini bekor qilasiz.",
    category: "defensive",
    targetType: "player",
    appliedAtTally: true,
  },
  {
    id: "immunity",
    name: "Daxlsizlik",
    description: "Bu bosqichda ovoz ko'p bo'lsa ham chiqarilmaysiz. O'rningizga ikkinchi ko'p ovoz olgan chiqariladi.",
    category: "defensive",
    targetType: "none",
    appliedAtTally: true,
  },
  {
    id: "shield",
    name: "Qalqon",
    description: "Bu bosqichda sizga berilgan ovozlar yarmiga tushiriladi (yuqoriga yaxlitlanadi).",
    category: "defensive",
    targetType: "none",
    appliedAtTally: true,
  },
  {
    id: "plea",
    name: "Iltijo",
    description: "Joriy bosqichdagi barcha ovozlar o'chiriladi. Hamma qayta ovoz berishi kerak.",
    category: "defensive",
    targetType: "none",
    appliedAtTally: false,
  },
  {
    id: "reflect",
    name: "Aks ettirish",
    description: "Sizga eng ko'p ovoz bergan o'yinchiga sizning barcha ovozlaringiz o'tkaziladi.",
    category: "defensive",
    targetType: "none",
    appliedAtTally: true,
  },
  {
    id: "last_chance",
    name: "Oxirgi imkoniyat",
    description: "Eng ko'p ovoz olsangiz, ikkinchi o'rindagi bilan tenglik hosil bo'ladi — bu bosqichda hech kim chiqarilmaydi.",
    category: "defensive",
    targetType: "none",
    appliedAtTally: true,
  },
  {
    id: "disperse",
    name: "Tarqatish",
    description: "Sizga berilgan ovozlar boshqa tirik o'yinchilar orasida tasodifiy taqsimlanadi.",
    category: "defensive",
    targetType: "none",
    appliedAtTally: true,
  },

  // ── Aggressive (6) ───────────────────────────────────────────────────────
  {
    id: "force_reveal",
    name: "Majburiy ochish",
    description: "Tanlagan o'yinchingizning yashirin kartalaridan birini hoziroq ochishini majburlaysiz.",
    category: "aggressive",
    targetType: "player_card",
    appliedAtTally: false,
  },
  {
    id: "double_vote",
    name: "Qo'shaloq ovoz",
    description: "Bu bosqichda sizning ovozingiz 2 ta hisoblanadi.",
    category: "aggressive",
    targetType: "none",
    appliedAtTally: true,
  },
  {
    id: "sabotage",
    name: "Sabotaj",
    description: "Tanlagan o'yinchingizning ochilmagan kartalaridan biri qayta yaratiladida (yaxshiroq yoki yomonroq bo'lishi mumkin).",
    category: "aggressive",
    targetType: "player",
    appliedAtTally: false,
  },
  {
    id: "silence",
    name: "Sukut",
    description: "Tanlagan o'yinchi bu bosqichda chatdan foydalana olmaydi.",
    category: "aggressive",
    targetType: "player",
    appliedAtTally: false,
  },
  {
    id: "slander",
    name: "Tuhmat",
    description: "Tanlagan o'yinchiga bu bosqichda 1 ta qo'shimcha (tizim) ovoz qo'shiladi.",
    category: "aggressive",
    targetType: "player",
    appliedAtTally: true,
  },
  {
    id: "hide_card",
    name: "Karta yashirish",
    description: "Tanlagan o'yinchining ochilgan kartalaridan birini qayta yopib qo'yasiz.",
    category: "aggressive",
    targetType: "player_card",
    appliedAtTally: false,
  },

  // ── Strategic (6) ────────────────────────────────────────────────────────
  {
    id: "card_swap",
    name: "Karta almashish",
    description: "O'zingizning bir kartangizni tanlagan o'yinchining bir kartasi bilan almashtirasiz.",
    category: "strategic",
    targetType: "player_card",
    appliedAtTally: false,
  },
  {
    id: "reroll_self",
    name: "Qayta yaratish",
    description: "O'zingizning ochilmagan kartalaridan birini tasodifiy yangi karta bilan almashtirasiz.",
    category: "strategic",
    targetType: "own_card",
    appliedAtTally: false,
  },
  {
    id: "new_life",
    name: "Yangi hayot",
    description: "Butun karakteringiz yangi tasodifiy karakter bilan almashtiriladi. Ochilgan kartalar qayta yopiladi.",
    category: "strategic",
    targetType: "none",
    appliedAtTally: false,
  },
  {
    id: "trade",
    name: "Savdo",
    description: "Bitta karta almashish taklifini yuborasiz. Nishon qabul qilsa — almashish bajariladi.",
    category: "strategic",
    targetType: "player_card",
    appliedAtTally: false,
  },
  {
    id: "alliance",
    name: "Yashirin ittifoq",
    description: "Bitta o'yinchi bilan ittifoq tuzasiz. U chiqarilsa, ovozlar ikkinchi ko'p ovoz olganga o'tadi.",
    category: "strategic",
    targetType: "player",
    appliedAtTally: true,
  },
  {
    id: "card_lock",
    name: "Karta qulflash",
    description: "O'zingizning ochilgan kartalaridan birini qayta yopib qo'yasiz.",
    category: "strategic",
    targetType: "own_card",
    appliedAtTally: false,
  },

  // ── Information (4) ──────────────────────────────────────────────────────
  {
    id: "peek",
    name: "Yashirin ko'rish",
    description: "Tanlagan o'yinchining yashirin kartalaridan birini faqat siz ko'rasiz (boshqalar ko'rmaydi).",
    category: "information",
    targetType: "player_card",
    appliedAtTally: false,
  },
  {
    id: "vote_tracker",
    name: "Ovoz kuzatuvchi",
    description: "Bu bosqichdagi to'liq ovoz jadvalini faqat siz ko'rasiz (kim kimga ovoz berganini).",
    category: "information",
    targetType: "none",
    appliedAtTally: false,
  },
  {
    id: "whisper",
    name: "Pichirlash",
    description: "Tanlagan o'yinchiga anonimlik bilan bitta shaxsiy xabar yuborasiz.",
    category: "information",
    targetType: "player",
    appliedAtTally: false,
  },
  {
    id: "bunker_analysis",
    name: "Bunker tahlili",
    description: "Ssenariy asosida har bir o'yinchining bunkerga foydalilik bahosini faqat siz ko'rasiz.",
    category: "information",
    targetType: "none",
    appliedAtTally: false,
  },
];

export const ABILITY_MAP = new Map(ABILITIES.map((a) => [a.id, a]));

export function getAbility(id: string): Ability | undefined {
  return ABILITY_MAP.get(id);
}

export function randomAbilityId(): string {
  return ABILITIES[Math.floor(Math.random() * ABILITIES.length)]!.id;
}

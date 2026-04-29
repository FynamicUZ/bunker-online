import type { Character, CharacterAttribute, BiologyAttribute, Scenario } from "@/lib/game/types";
import professionsData from "@/data/professions.json";
import healthData from "@/data/health.json";
import hobbiesData from "@/data/hobbies.json";
import traitsData from "@/data/traits.json";
import extrasData from "@/data/extras.json";
import scenariosData from "@/data/scenarios.json";

function pickRandom<T>(arr: T[]): T {
  const item = arr[Math.floor(Math.random() * arr.length)];
  if (item === undefined) throw new Error("Cannot pick from empty array");
  return item;
}

function generateBiology(): BiologyAttribute {
  const age = Math.floor(Math.random() * 53) + 18; // 18–70
  const gender: "erkak" | "ayol" = Math.random() < 0.5 ? "erkak" : "ayol";
  const genderLabel = gender === "erkak" ? "Erkak" : "Ayol";
  return {
    age,
    gender,
    description: `${genderLabel}, ${age} yoshda`,
  };
}

export function generateCharacter(): Character {
  return {
    profession: pickRandom(professionsData) as CharacterAttribute,
    biology: generateBiology(),
    health: pickRandom(healthData) as CharacterAttribute,
    hobby: pickRandom(hobbiesData) as CharacterAttribute,
    trait: pickRandom(traitsData) as CharacterAttribute,
    extra: pickRandom(extrasData) as CharacterAttribute,
  };
}

export function generateCharacters(count: number): Character[] {
  return Array.from({ length: count }, generateCharacter);
}

export function pickScenario(): Scenario {
  const raw = pickRandom(scenariosData);
  return raw as Scenario;
}

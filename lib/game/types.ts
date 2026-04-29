export type RoomStatus = "lobby" | "playing" | "finished";
export type GamePhase = "reveal" | "discussion" | "voting";

export type CharacterField =
  | "profession"
  | "biology"
  | "health"
  | "hobby"
  | "trait"
  | "extra";

export interface CharacterAttribute {
  name: string;
  description: string;
}

export interface BiologyAttribute {
  age: number;
  gender: "erkak" | "ayol";
  description: string;
}

export interface Character {
  profession: CharacterAttribute;
  biology: BiologyAttribute;
  health: CharacterAttribute;
  hobby: CharacterAttribute;
  trait: CharacterAttribute;
  extra: CharacterAttribute;
}

export interface Room {
  id: string;
  code: string;
  hostId: string;
  status: RoomStatus;
  maxPlayers: number;
  bunkerCapacity: number;
  currentRound: number;
  currentPhase: GamePhase | null;
  currentTurnIndex: number;
  turnStartedAt: string | null;
  turnWarningAt: string | null;
  turnGraceAt: string | null;
  scenarioId: string | null;
  settings: Record<string, unknown>;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
}

export interface Player {
  id: string;
  roomId: string;
  nickname: string;
  sessionId: string;
  isHost: boolean;
  isAlive: boolean;
  isBot: boolean;
  revealOrder: number | null;
  joinedAt: string;
  character: Character | null;
  revealedFields: CharacterField[];
}

export interface Vote {
  id: string;
  roomId: string;
  round: number;
  voterId: string;
  targetId: string;
  createdAt: string;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  bunkerDuration: string;
  bunkerSize: string;
  usefulSkills: string[];
}

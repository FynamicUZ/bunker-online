import { z } from "zod";

export const nicknameSchema = z
  .string()
  .trim()
  .min(2, "Nickname kamida 2 ta belgidan iborat bo'lishi kerak")
  .max(20, "Nickname 20 ta belgidan oshmasligi kerak")
  .regex(/^[\p{L}\p{N}_\-\s]+$/u, "Faqat harflar, raqamlar, _ va - belgilari");

export const roomCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .length(6, "Xona kodi aynan 6 ta belgidan iborat")
  .regex(/^[A-Z0-9]+$/, "Faqat harflar va raqamlar");

export const createRoomFormSchema = z.object({
  nickname: nicknameSchema,
});

export const joinRoomFormSchema = z.object({
  nickname: nicknameSchema,
  roomCode: roomCodeSchema,
});

export type CreateRoomForm = z.infer<typeof createRoomFormSchema>;
export type JoinRoomForm = z.infer<typeof joinRoomFormSchema>;

import { z } from "zod";

const gameScoreSchema = z.object({
  player1Points: z.coerce.number().int().min(0, "Score cannot be negative"),
  player2Points: z.coerce.number().int().min(0, "Score cannot be negative"),
});

export const submitResultSchema = z.object({
  games: z.array(gameScoreSchema).min(1).max(7),
});

export type SubmitResultInput = z.infer<typeof submitResultSchema>;

export const confirmResultSchema = z.object({
  confirmationCode: z.string().regex(/^\d{4}$/, "Code must be exactly 4 digits"),
});

export type ConfirmResultInput = z.infer<typeof confirmResultSchema>;

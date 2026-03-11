import { z } from "zod";

export const createTournamentSchema = z.object({
  organizationId: z.string().min(1, "Organization is required"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  location: z.string().max(200, "Location must be 200 characters or fewer").optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const createEventSchema = z.object({
  ratingCategoryId: z.string().min(1, "Rating category is required"),
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  format: z.enum(["BEST_OF_3", "BEST_OF_5", "BEST_OF_7"]),
  gamePointTarget: z.coerce
    .number()
    .int()
    .refine((v) => v === 11 || v === 21, { message: "Game point target must be 11 or 21" }),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const addEntrantSchema = z.object({
  playerProfileId: z.string().min(1, "Player is required"),
});

export type AddEntrantInput = z.infer<typeof addEntrantSchema>;

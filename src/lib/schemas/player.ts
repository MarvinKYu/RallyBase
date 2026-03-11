import { z } from "zod";

export const createProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be 50 characters or fewer"),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or fewer")
    .optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;

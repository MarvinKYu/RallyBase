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
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .optional(),
  birthDate: z.string().optional(),
});

export type CreateProfileInput = z.infer<typeof createProfileSchema>;

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, "Display name must be at least 2 characters")
    .max(50, "Display name must be 50 characters or fewer"),
  bio: z
    .string()
    .max(500, "Bio must be 500 characters or fewer")
    .optional(),
  gender: z
    .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .optional()
    .or(z.literal("")),
  birthDate: z.string().optional().or(z.literal("")),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

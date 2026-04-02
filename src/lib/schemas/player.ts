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
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], "Please select a gender option"),
  birthDate: z.string().min(1, "Date of birth is required"),
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
  showGender: z.coerce.boolean().optional(),
  showAge: z.coerce.boolean().optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

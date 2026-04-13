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
  startTime: z.string().optional().or(z.literal("")),
  withdrawDeadline: z.string().optional().or(z.literal("")),
  verificationMethod: z.enum(["CODE", "BIRTH_YEAR", "BOTH"]).default("CODE"),
});

export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;

export const createEventSchema = z
  .object({
    ratingCategoryId: z.string().min(1, "Rating category is required"),
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be 100 characters or fewer"),
    format: z.enum(["BEST_OF_3", "BEST_OF_5", "BEST_OF_7"]),
    eventFormat: z
      .enum(["SINGLE_ELIMINATION", "ROUND_ROBIN", "RR_TO_SE"])
      .default("SINGLE_ELIMINATION"),
    groupSize: z.coerce.number().int().min(3).max(6).optional().or(z.literal("")),
    advancersPerGroup: z.coerce.number().int().min(1).max(2).optional().or(z.literal("")),
    gamePointTarget: z.coerce
      .number()
      .int()
      .pipe(z.union([z.literal(11), z.literal(21)])),
    rrFormat: z.enum(["BEST_OF_3", "BEST_OF_5", "BEST_OF_7"]).optional().or(z.literal("")),
    rrGamePointTarget: z.coerce
      .number()
      .int()
      .pipe(z.union([z.literal(11), z.literal(21)]))
      .optional()
      .or(z.literal("")),
    // Eligibility settings (all optional)
    maxParticipants: z.coerce.number().int().positive().optional().or(z.literal("")),
    minRating: z.coerce.number().positive().optional().or(z.literal("")),
    maxRating: z.coerce.number().positive().optional().or(z.literal("")),
    minAge: z.coerce.number().int().positive().optional().or(z.literal("")),
    maxAge: z.coerce.number().int().positive().optional().or(z.literal("")),
    allowedGender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
    startTime: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    const isGroupBased = data.eventFormat === "ROUND_ROBIN" || data.eventFormat === "RR_TO_SE";
    if (
      isGroupBased &&
      data.groupSize &&
      data.maxParticipants &&
      data.maxParticipants % data.groupSize !== 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxParticipants"],
        message: `Max participants must be a multiple of group size (${data.groupSize})`,
      });
    }
  });

export type CreateEventInput = z.infer<typeof createEventSchema>;

export const updateTournamentSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  location: z.string().max(200, "Location must be 200 characters or fewer").optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
  startTime: z.string().optional().or(z.literal("")),
  withdrawDeadline: z.string().optional().or(z.literal("")),
  verificationMethod: z.enum(["CODE", "BIRTH_YEAR", "BOTH"]).default("CODE"),
});

export type UpdateTournamentInput = z.infer<typeof updateTournamentSchema>;

export const updateEventSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be 100 characters or fewer"),
  format: z.enum(["BEST_OF_3", "BEST_OF_5", "BEST_OF_7"]),
  groupSize: z.coerce.number().int().min(3).max(6).optional().or(z.literal("")),
  advancersPerGroup: z.coerce.number().int().min(1).max(2).optional().or(z.literal("")),
  gamePointTarget: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(11), z.literal(21)])),
  rrFormat: z.enum(["BEST_OF_3", "BEST_OF_5", "BEST_OF_7"]).optional().or(z.literal("")),
  rrGamePointTarget: z.coerce
    .number()
    .int()
    .pipe(z.union([z.literal(11), z.literal(21)]))
    .optional()
    .or(z.literal("")),
  maxParticipants: z.coerce.number().int().positive().optional().or(z.literal("")),
  minRating: z.coerce.number().positive().optional().or(z.literal("")),
  maxRating: z.coerce.number().positive().optional().or(z.literal("")),
  minAge: z.coerce.number().int().positive().optional().or(z.literal("")),
  maxAge: z.coerce.number().int().positive().optional().or(z.literal("")),
  allowedGender: z.enum(["MALE", "FEMALE"]).optional().or(z.literal("")),
  startTime: z.string().optional().or(z.literal("")),
});

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export const addEntrantSchema = z.object({
  playerProfileId: z.string().min(1, "Player is required"),
});

export type AddEntrantInput = z.infer<typeof addEntrantSchema>;

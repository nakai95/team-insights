import { z } from "zod";

export const AnalysisRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url()
    .regex(
      /^https:\/\/github\.com\/[\w-]+\/[\w-]+$/,
      "Must be a valid GitHub repository URL",
    ),
  githubToken: z
    .string()
    .min(20, "Token is too short")
    .max(100, "Token is too long")
    .regex(/^[a-zA-Z0-9_]+$/, "Token contains invalid characters"),
  dateRange: z
    .object({
      start: z.coerce.date(),
      end: z.coerce.date(),
    })
    .optional()
    .refine(
      (range) => !range || range.start < range.end,
      "Start date must be before end date",
    )
    .refine(
      (range) => !range || range.end <= new Date(),
      "End date cannot be in the future",
    ),
});

export type AnalysisRequest = z.infer<typeof AnalysisRequestSchema>;

export const MergeRequestSchema = z.object({
  repositoryUrl: z
    .string()
    .url()
    .regex(/^https:\/\/github\.com\/[\w-]+\/[\w-]+$/),
  primaryContributorId: z.string().uuid(),
  mergedContributorIds: z
    .array(z.string().uuid())
    .min(1, "Must merge at least one contributor")
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Duplicate contributor IDs not allowed",
    ),
});

export type MergeRequest = z.infer<typeof MergeRequestSchema>;

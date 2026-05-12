import { z } from "zod";
import { RATINGS } from "./ratings";

export const ratingSchema = z.enum(RATINGS);

export const createSessionSchema = z.object({
  date: z.iso.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type CreateSessionInput = z.infer<typeof createSessionSchema>;

export const updateSessionSchema = z.object({
  date: z.iso.date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});
export type UpdateSessionInput = z.infer<typeof updateSessionSchema>;

export const createStepSchema = z.object({
  duration_seconds: z.number().int().min(0).max(86_400),
  rating: ratingSchema,
  notes: z.string().max(2000).nullable().optional(),
});
export type CreateStepInput = z.infer<typeof createStepSchema>;

export const updateStepSchema = createStepSchema.partial();
export type UpdateStepInput = z.infer<typeof updateStepSchema>;

export interface StepDTO {
  id: number;
  session_id: number;
  step_number: number;
  duration_seconds: number;
  rating: (typeof RATINGS)[number];
  notes: string | null;
}

export interface SessionDTO {
  id: number;
  date: string | null;
  global_day: number;
  notes: string | null;
  created_at: number;
  steps: StepDTO[];
}

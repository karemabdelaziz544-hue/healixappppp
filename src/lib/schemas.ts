import { z } from 'zod';

export const InbodyRecordSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  weight: z.number(),
  muscle_mass: z.number().nullable(),
  fat_percent: z.number().nullable(),
  record_date: z.string(),
  ai_summary: z.string().nullable(),
  image_url: z.string().nullable(),
  created_at: z.string().optional(),
});

export const UserProfileSchema = z.object({
  id: z.string(),
  full_name: z.string().nullable(),
  avatar_url: z.string().nullable(),
});

// Edge function analysis response schema
export const EdgeFunctionInbodyResponseSchema = z.object({
  analysis: z.string().optional(),
  extracted: z.object({
    weight: z.number().nullable().optional(),
    muscle: z.number().nullable().optional(),
    fat: z.number().nullable().optional(),
  }).optional(),
});

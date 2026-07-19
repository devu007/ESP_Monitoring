import { z } from 'zod';

export const createEspSchema = z.object({
  manufacturer: z.string().min(1, 'Manufacturer is required').max(200),
  model: z.string().min(1, 'Model is required').max(200),
  installationDate: z.string().datetime({ message: 'Invalid date format, use ISO 8601' }),
  pumpStages: z.number().int().positive('Pump stages must be positive'),
  ratedPower: z.number().positive('Rated power must be positive'),
  ratedSpeed: z.number().positive('Rated speed must be positive'),
  frequencyMin: z.number().positive('Frequency min must be positive'),
  frequencyMax: z.number().positive('Frequency max must be positive'),
  motorRating: z.number().positive('Motor rating must be positive'),
  designFlowMin: z.number().positive('Design flow min must be positive'),
  designFlowMax: z.number().positive('Design flow max must be positive'),
}).refine(data => data.frequencyMax > data.frequencyMin, {
  message: 'Frequency max must be greater than frequency min',
  path: ['frequencyMax'],
}).refine(data => data.designFlowMax > data.designFlowMin, {
  message: 'Design flow max must be greater than design flow min',
  path: ['designFlowMax'],
});

export const updateEspSchema = z.object({
  manufacturer: z.string().min(1).max(200).optional(),
  model: z.string().min(1).max(200).optional(),
  installationDate: z.string().datetime().optional(),
  pumpStages: z.number().int().positive().optional(),
  ratedPower: z.number().positive().optional(),
  ratedSpeed: z.number().positive().optional(),
  frequencyMin: z.number().positive().optional(),
  frequencyMax: z.number().positive().optional(),
  motorRating: z.number().positive().optional(),
  designFlowMin: z.number().positive().optional(),
  designFlowMax: z.number().positive().optional(),
});

export type CreateEspInput = z.infer<typeof createEspSchema>;
export type UpdateEspInput = z.infer<typeof updateEspSchema>;

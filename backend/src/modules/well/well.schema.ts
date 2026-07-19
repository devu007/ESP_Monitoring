import { z } from 'zod';

export const createWellSchema = z.object({
  name: z.string().min(1, 'Well name is required').max(200),
  fieldId: z.string().uuid('Invalid field ID'),
  apiNumber: z.string().max(50).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export const updateWellSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  apiNumber: z.string().max(50).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SHUT_IN']).optional(),
});

export type CreateWellInput = z.infer<typeof createWellSchema>;
export type UpdateWellInput = z.infer<typeof updateWellSchema>;

import { z } from 'zod';

export const createFieldSchema = z.object({
  name: z.string().min(1, 'Field name is required').max(200),
  location: z.string().max(500).optional(),
  description: z.string().max(1000).optional(),
});

export const updateFieldSchema = createFieldSchema.partial();

export type CreateFieldInput = z.infer<typeof createFieldSchema>;
export type UpdateFieldInput = z.infer<typeof updateFieldSchema>;

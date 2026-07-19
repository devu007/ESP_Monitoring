import { z } from 'zod';

export const uploadParamsSchema = z.object({
  wellId: z.string().uuid('Invalid well ID'),
});

export type UploadParams = z.infer<typeof uploadParamsSchema>;

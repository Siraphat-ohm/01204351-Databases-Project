import { z } from 'zod';

export const crewCertificationSchema = z.object({
  name: z.string().trim().min(2),
  expireDate: z.coerce.date(),
});

export const upsertCrewProfileSchema = z.object({
  nickname: z.string().trim().min(1).max(80).optional(),
  languages: z.array(z.string().trim().min(2)).default([]),
  certifications: z.array(crewCertificationSchema).default([]),
  flightHours: z.number().min(0).default(0),
});

export const patchCrewProfileSchema = z
  .object({
    nickname: z.string().trim().min(1).max(80).optional(),
    languages: z.array(z.string().trim().min(2)).optional(),
    certifications: z.array(crewCertificationSchema).optional(),
    flightHours: z.number().min(0).optional(),
  })
  .refine(
    (data) =>
      data.nickname !== undefined ||
      data.languages !== undefined ||
      data.certifications !== undefined ||
      data.flightHours !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export type UpsertCrewProfileInput = z.infer<typeof upsertCrewProfileSchema>;
export type PatchCrewProfileInput = z.infer<typeof patchCrewProfileSchema>;

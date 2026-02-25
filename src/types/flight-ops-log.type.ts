import { z } from 'zod';

export const gateChangeSchema = z.object({
  from: z.string().trim().min(1),
  to: z.string().trim().min(1),
  time: z.coerce.date().default(() => new Date()),
  reason: z.string().trim().min(2),
});

export const weatherConditionsSchema = z.object({
  origin: z.string().trim().min(2),
  destination: z.string().trim().min(2),
});

export const upsertFlightOpsLogSchema = z.object({
  captainName: z.string().trim().min(2),
  gateChanges: z.array(gateChangeSchema).default([]),
  weatherConditions: weatherConditionsSchema.optional(),
  incidents: z.array(z.string().trim().min(2)).default([]),
  maintenanceChecklist: z.record(z.string(), z.unknown()).optional(),
});

export const patchFlightOpsLogSchema = z
  .object({
    captainName: z.string().trim().min(2).optional(),
    gateChanges: z.array(gateChangeSchema).optional(),
    weatherConditions: weatherConditionsSchema.optional(),
    incidents: z.array(z.string().trim().min(2)).optional(),
    maintenanceChecklist: z.record(z.string(), z.unknown()).optional(),
  })
  .refine(
    (data) =>
      data.captainName !== undefined ||
      data.gateChanges !== undefined ||
      data.weatherConditions !== undefined ||
      data.incidents !== undefined ||
      data.maintenanceChecklist !== undefined,
    { message: 'At least one field must be provided for update' },
  );

export type UpsertFlightOpsLogInput = z.infer<typeof upsertFlightOpsLogSchema>;
export type PatchFlightOpsLogInput = z.infer<typeof patchFlightOpsLogSchema>;

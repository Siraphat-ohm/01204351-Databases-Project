import { z } from 'zod';

export const issueCategorySchema = z.enum([
  'booking',
  'payment',
  'flight',
  'baggage',
  'other',
]);

export const issueStatusSchema = z.enum([
  'open',
  'investigating',
  'resolved',
  'closed',
]);

export const createIssueReportSchema = z.object({
  category: issueCategorySchema,
  description: z.string().trim().min(5),
  attachments: z.array(z.string().url()).default([]),
});

export const createIssueReportAdminSchema = createIssueReportSchema.extend({
  userId: z.cuid({ message: 'Invalid user ID' }),
});

export const updateIssueReportStatusSchema = z.object({
  status: issueStatusSchema,
  note: z.string().trim().min(2).optional(),
});

export const updateIssueReportSchema = z
  .object({
    category: issueCategorySchema.optional(),
    description: z.string().trim().min(5).optional(),
    attachments: z.array(z.string().url()).optional(),
    status: issueStatusSchema.optional(),
    note: z.string().trim().min(2).optional(),
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    { message: 'At least one field must be provided for update' },
  );

export type CreateIssueReportInput = z.infer<typeof createIssueReportSchema>;
export type CreateIssueReportAdminInput = z.infer<typeof createIssueReportAdminSchema>;
export type UpdateIssueReportStatusInput = z.infer<typeof updateIssueReportStatusSchema>;
export type UpdateIssueReportInput = z.infer<typeof updateIssueReportSchema>;

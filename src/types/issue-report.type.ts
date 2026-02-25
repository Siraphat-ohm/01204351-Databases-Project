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

export const updateIssueReportStatusSchema = z.object({
  status: issueStatusSchema,
  note: z.string().trim().min(2).optional(),
});

export type CreateIssueReportInput = z.infer<typeof createIssueReportSchema>;
export type UpdateIssueReportStatusInput = z.infer<typeof updateIssueReportStatusSchema>;

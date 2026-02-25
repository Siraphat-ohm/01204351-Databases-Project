import { issueReportRepository } from '@/repositories/issue-report.repository';
import {
  createIssueReportSchema,
  updateIssueReportStatusSchema,
  type CreateIssueReportInput,
  type UpdateIssueReportStatusInput,
} from '@/types/issue-report.type';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';

export class IssueReportNotFoundError extends Error {
  constructor(id: string) {
    super(`Issue report not found: ${id}`);
    this.name = 'IssueReportNotFoundError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on issue report`);
    this.name = 'UnauthorizedError';
  }
}

function isAdmin(session: Session) {
  return hasAnyRole(session, ['ADMIN']);
}

export const issueReportService = {
  async findById(id: string, session: Session) {
    const issue = await issueReportRepository.findById(id);
    if (!issue) throw new IssueReportNotFoundError(id);

    const issueUserId = String((issue as { userId: unknown }).userId);
    if (!isAdmin(session) && issueUserId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return issue;
  },

  async findMine(session: Session) {
    return issueReportRepository.findByUserId(session.user.id);
  },

  async findAll(session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');
    return issueReportRepository.findAll();
  },

  async createMine(input: CreateIssueReportInput, session: Session) {
    const data = createIssueReportSchema.parse(input);
    return issueReportRepository.createForUser(session.user.id, data);
  },

  async updateStatus(id: string, input: UpdateIssueReportStatusInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('update-status');

    const data = updateIssueReportStatusSchema.parse(input);
    const updated = await issueReportRepository.updateStatus(id, {
      ...data,
      resolvedBy: session.user.id,
    });

    if (!updated) throw new IssueReportNotFoundError(id);
    return updated;
  },
};

import { issueReportRepository } from '@/repositories/issue-report.repository';
import {
  createIssueReportSchema,
  updateIssueReportStatusSchema,
  type CreateIssueReportInput,
  type UpdateIssueReportStatusInput,
} from '@/types/issue-report.type';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

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

  async findMinePaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Awaited<ReturnType<typeof issueReportRepository.findAll>>[number]>> {
    const { page, limit, skip } = resolvePagination(params);

    const [data, total] = await Promise.all([
      issueReportRepository.findMany({
        where: { userId: session.user.id },
        skip,
        take: limit,
      }),
      issueReportRepository.count({ userId: session.user.id }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async findAll(session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');
    return issueReportRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<Awaited<ReturnType<typeof issueReportRepository.findAll>>[number]>> {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      issueReportRepository.findMany({
        skip,
        take: limit,
      }),
      issueReportRepository.count(),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
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

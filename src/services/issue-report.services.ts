import { issueReportRepository } from '@/repositories/issue-report.repository';
import {
  createIssueReportAdminSchema,
  createIssueReportSchema,
  updateIssueReportSchema,
  updateIssueReportStatusSchema,
  type CreateIssueReportAdminInput,
  type CreateIssueReportInput,
  type UpdateIssueReportInput,
  type UpdateIssueReportStatusInput,
} from '@/types/issue-report.type';
import type { PaginatedResponse } from '@/types/common';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { hasAnyRole } from '@/services/_shared/role';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

import { NotFoundError, UnauthorizedError } from '@/lib/errors';

function isAdmin(session: Session) {
  return hasAnyRole(session, ['ADMIN']);
}

export const issueReportService = {
  async findById(id: string, session: Session) {
    const issue = await issueReportRepository.findById(id);
    if (!issue) throw new NotFoundError(`Issue report not found: ${id}`);

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
    params?: PaginationParams<Record<string, unknown>>,
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
    params?: PaginationParams<Record<string, unknown>>,
  ): Promise<PaginatedResponse<Awaited<ReturnType<typeof issueReportRepository.findAll>>[number]>> {
    if (!isAdmin(session)) throw new UnauthorizedError('read-all');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total] = await Promise.all([
      issueReportRepository.findMany({ where, skip, take: limit }),
      issueReportRepository.count(where),
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

  async create(input: CreateIssueReportAdminInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('create');

    const data = createIssueReportAdminSchema.parse(input);
    return issueReportRepository.create(data);
  },

  async updateStatus(id: string, input: UpdateIssueReportStatusInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('update-status');

    const data = updateIssueReportStatusSchema.parse(input);
    const updated = await issueReportRepository.updateStatus(id, {
      ...data,
      resolvedBy: session.user.id,
    });

    if (!updated) throw new NotFoundError(`Issue report not found: ${id}`);
    return updated;
  },

  async updateById(id: string, input: UpdateIssueReportInput, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('update');

    const data = updateIssueReportSchema.parse(input);
    const updated = await issueReportRepository.updateById(id, {
      ...data,
      resolvedBy: session.user.id,
    });

    if (!updated) throw new NotFoundError(`Issue report not found: ${id}`);
    return updated;
  },

  async deleteById(id: string, session: Session) {
    if (!isAdmin(session)) throw new UnauthorizedError('delete');

    const deleted = await issueReportRepository.deleteById(id);
    if (!deleted) throw new NotFoundError(`Issue report not found: ${id}`);
    return deleted;
  },
};

import { staffRepository } from '@/repositories/staff.repository';
import {
  createStaffSchema,
  updateStaffSchema,
  staffAdminInclude,
  type CreateStaffInput,
  type StaffAdmin,
  type StaffListItem,
  type StaffServiceAction,
  type UpdateStaffInput,
} from '@/types/staff.type';
import { canAccessStaff } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import type { Prisma } from '@/generated/prisma/client';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';
const { checkPermission } = makePermissionHelpers<StaffServiceAction>(
  canAccessStaff,
  'staff',
  (a) => new UnauthorizedError(a),
);

export const staffService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const staff = await staffRepository.findById(id, staffAdminInclude);
    if (!staff) throw new NotFoundError(`Staff profile not found: ${id}`);
    return staff as StaffAdmin;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return staffRepository.findAll({ include: staffAdminInclude });
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.StaffProfileWhereInput>,
  ): Promise<PaginatedResponse<StaffListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const where = (params as any)?.where;
    const [data, total]: [StaffListItem[], number] = await Promise.all([
      staffRepository.findAll({ where, skip, take: limit, include: staffAdminInclude }) as Promise<StaffListItem[]>,
      staffRepository.count(where),
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

  async createStaff(input: CreateStaffInput, session: Session) {
    checkPermission(session, 'create');

    const data = createStaffSchema.parse(input);

    const userExists = await staffRepository.findByUserId(data.userId).catch(() => null);
    if (userExists) throw new ConflictError('User already has a staff profile');

    const employeeExists = await staffRepository.findByEmployeeId(data.employeeId).catch(() => null);
    if (employeeExists) throw new ConflictError('Employee ID already exists');

    return staffRepository.create(data, staffAdminInclude);
  },

  async updateStaff(id: string, input: UpdateStaffInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateStaffSchema.parse(input);
    const existing = await staffRepository.findById(id);

    if (data.employeeId && data.employeeId !== existing.employeeId) {
      const employeeExists = await staffRepository.findByEmployeeId(data.employeeId).then(() => true).catch(() => false);
      if (employeeExists) throw new ConflictError('Employee ID already exists');
    }

    return staffRepository.update(id, data, staffAdminInclude);
  },

  async deleteStaff(id: string, session: Session) {
    checkPermission(session, 'delete');

    await staffRepository.findById(id);

    const flightCount = await staffRepository.countPilotedFlights(id);
    if (flightCount > 0) throw new ConflictError(`Cannot delete staff with active flights: ${id}`);

    return staffRepository.delete(id, staffAdminInclude);
  },
};

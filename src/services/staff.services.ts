import { staffRepository } from '@/repositories/staff.repository';
import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
} from '@/types/staff.type';
import { canAccessStaff } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';
import type { PaginatedResponse } from '@/types/common';
import { makeCheckPermission } from '@/services/_shared/authorization';
import { NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';

type StaffListItem = Awaited<ReturnType<typeof staffRepository.findAll>>[number];

const checkPermission = makeCheckPermission(
  canAccessStaff,
  'staff',
  (a) => new UnauthorizedError(a),
);

export const staffService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const staff = await staffRepository.findById(id);
    if (!staff) throw new NotFoundError(`Staff not found: ${id}`);
    return staff;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return staffRepository.findAll();
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams,
  ): Promise<PaginatedResponse<StaffListItem>> {
    checkPermission(session, 'read');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      staffRepository.findAll({ skip, take: limit }),
      staffRepository.count(),
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

    const [existingUser, existingEmployee] = await Promise.all([
      staffRepository.findByUserId(data.userId),
      staffRepository.findByEmployeeId(data.employeeId),
    ]);

    if (existingUser) {
      throw new ConflictError('User already has a staff profile');
    }
    if (existingEmployee) {
      throw new ConflictError('Employee ID already exists');
    }

    return staffRepository.create(data);
  },

  async updateStaff(id: string, input: UpdateStaffInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateStaffSchema.parse(input);
    const existing = await staffRepository.findById(id);
    if (!existing) throw new NotFoundError(`Staff not found: ${id}`);

    if (data.employeeId && data.employeeId !== existing.employeeId) {
      const conflict = await staffRepository.findByEmployeeId(data.employeeId);
      if (conflict) throw new ConflictError('Employee ID already exists');
    }

    return staffRepository.update(id, data);
  },

  async deleteStaff(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await staffRepository.findById(id);
    if (!existing) throw new NotFoundError(`Staff not found: ${id}`);

    const flightCount = await staffRepository.countPilotedFlights(id);
    if (flightCount > 0) throw new ConflictError(`Cannot delete staff with active flights: ${id}`);

    return staffRepository.delete(id);
  },
};

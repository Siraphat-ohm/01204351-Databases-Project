import { staffRepository } from '@/repositories/staff.repository';
import {
  createStaffSchema,
  updateStaffSchema,
  type CreateStaffInput,
  type UpdateStaffInput,
} from '@/types/staff.type';
import { canAccessStaff } from '@/auth/permissions';
import type { ServiceSession as Session } from '@/services/_shared/session';

export class StaffNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Staff not found: ${identifier}`);
    this.name = 'StaffNotFoundError';
  }
}

export class StaffConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StaffConflictError';
  }
}

export class StaffInUseError extends Error {
  constructor(staffId: string) {
    super(`Cannot delete staff with active flights: ${staffId}`);
    this.name = 'StaffInUseError';
  }
}

export class UnauthorizedError extends Error {
  constructor(action: string) {
    super(`Unauthorized: cannot perform "${action}" on staff`);
    this.name = 'UnauthorizedError';
  }
}

function checkPermission(
  session: Session,
  action: 'create' | 'read' | 'update' | 'delete',
) {
  const allowed = canAccessStaff(session.user.role, action);
  if (!allowed) throw new UnauthorizedError(action);
}

export const staffService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const staff = await staffRepository.findById(id);
    if (!staff) throw new StaffNotFoundError(id);
    return staff;
  },

  async findAll(session: Session) {
    checkPermission(session, 'read');
    return staffRepository.findAll();
  },

  async createStaff(input: CreateStaffInput, session: Session) {
    checkPermission(session, 'create');

    const data = createStaffSchema.parse(input);

    const [existingUser, existingEmployee] = await Promise.all([
      staffRepository.findByUserId(data.userId),
      staffRepository.findByEmployeeId(data.employeeId),
    ]);

    if (existingUser) {
      throw new StaffConflictError('User already has a staff profile');
    }
    if (existingEmployee) {
      throw new StaffConflictError('Employee ID already exists');
    }

    return staffRepository.create(data);
  },

  async updateStaff(id: string, input: UpdateStaffInput, session: Session) {
    checkPermission(session, 'update');

    const data = updateStaffSchema.parse(input);
    const existing = await staffRepository.findById(id);
    if (!existing) throw new StaffNotFoundError(id);

    if (data.employeeId && data.employeeId !== existing.employeeId) {
      const conflict = await staffRepository.findByEmployeeId(data.employeeId);
      if (conflict) throw new StaffConflictError('Employee ID already exists');
    }

    return staffRepository.update(id, data);
  },

  async deleteStaff(id: string, session: Session) {
    checkPermission(session, 'delete');

    const existing = await staffRepository.findById(id);
    if (!existing) throw new StaffNotFoundError(id);

    const flightCount = await staffRepository.countPilotedFlights(id);
    if (flightCount > 0) throw new StaffInUseError(id);

    return staffRepository.delete(id);
  },
};

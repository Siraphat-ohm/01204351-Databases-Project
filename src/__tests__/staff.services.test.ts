import { staffService } from '../services/staff.services';
import { staffRepository } from '@/repositories/staff.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';

// Mock repository
jest.mock('@/repositories/staff.repository', () => ({
  staffRepository: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findByEmployeeId: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countPilotedFlights: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessStaff: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && action === 'read') return true;
    return false;
  }),
}));

describe('staffService', () => {
  const adminSession = {
    user: { id: 'admin-id', role: 'ADMIN' },
  };

  const passengerSession = {
    user: { id: 'passenger-id', role: 'PASSENGER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('should return staff if found', async () => {
      const mockStaff = { id: '1', employeeId: 'EMP001' };
      (staffRepository.findById as jest.Mock).mockResolvedValue(mockStaff);

      const result = await staffService.findById('1', adminSession as any);
      expect(result).toEqual(mockStaff);
    });

    it('should throw NotFoundError if staff not found', async () => {
      (staffRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(staffService.findById('non-existent', adminSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createStaff', () => {
    const createInput = {
      userId: 'cl00000000000000000000001',
      employeeId: 'EMP001',
      role: 'PILOT' as any,
    };

    it('should create staff for admin', async () => {
      (staffRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (staffRepository.findByEmployeeId as jest.Mock).mockResolvedValue(null);
      (staffRepository.create as jest.Mock).mockResolvedValue({ id: 'new-id', ...createInput });

      const result = await staffService.createStaff(createInput, adminSession as any);
      expect(result.employeeId).toBe('EMP001');
    });

    it('should throw ConflictError if employee ID already exists', async () => {
      (staffRepository.findByUserId as jest.Mock).mockResolvedValue(null);
      (staffRepository.findByEmployeeId as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(staffService.createStaff(createInput, adminSession as any))
        .rejects.toThrow(ConflictError);
    });
  });
});

import { aircraftService } from '../services/aircraft.services';
import { aircraftRepository } from '@/repositories/aircraft.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';

// Mock repository
jest.mock('@/repositories/aircraft.repository', () => ({
  aircraftRepository: {
    findById: jest.fn(),
    findAll: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findByTailNumber: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countFlights: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessAircraft: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && action === 'read') return true;
    return false;
  }),
}));

describe('aircraftService', () => {
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
    it('should return aircraft if found', async () => {
      const mockAircraft = { id: '1', tailNumber: 'HS-TBA' };
      (aircraftRepository.findById as jest.Mock).mockResolvedValue(mockAircraft);

      const result = await aircraftService.findById('1', adminSession as any);
      expect(result).toEqual(mockAircraft);
    });

    it('should throw NotFoundError if aircraft not found', async () => {
      (aircraftRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(aircraftService.findById('non-existent', adminSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createAircraft', () => {
    const createInput = {
      tailNumber: 'HS-NEW',
      aircraftTypeId: 'cl00000000000000000000000', // Valid CUID-like string
      status: 'ACTIVE' as any,
    };

    it('should create aircraft for admin', async () => {
      (aircraftRepository.findByTailNumber as jest.Mock).mockResolvedValue(null);
      (aircraftRepository.create as jest.Mock).mockResolvedValue({ id: 'new-id', ...createInput });

      const result = await aircraftService.createAircraft(createInput, adminSession as any);
      expect(result.tailNumber).toBe('HS-NEW');
      expect(aircraftRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if tail number already exists', async () => {
      (aircraftRepository.findByTailNumber as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(aircraftService.createAircraft(createInput, adminSession as any))
        .rejects.toThrow(ConflictError);
    });

    it('should throw UnauthorizedError for passengers', async () => {
      await expect(aircraftService.createAircraft(createInput, passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});

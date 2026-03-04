import { flightService } from '../services/flight.services';
import { flightRepository } from '@/repositories/flight.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';

// Mock flightRepository
jest.mock('@/repositories/flight.repository', () => ({
  flightRepository: {
    findMany: jest.fn(),
    count: jest.fn(),
    findById: jest.fn(),
    countBookings: jest.fn(),
    delete: jest.fn(),
    isAdminRole: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessFlight: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && action === 'read') return true;
    return false;
  }),
}));

describe('flightService', () => {
  const adminSession = {
    user: {
      id: 'admin-id',
      role: 'ADMIN',
    },
  };

  const passengerSession = {
    user: {
      id: 'passenger-id',
      role: 'PASSENGER',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findAllPaginated', () => {
    it('should return paginated flights for admin', async () => {
      const mockFlights = [{ id: '1', flightCode: 'TG101' }];
      (flightRepository.findMany as jest.Mock).mockResolvedValue(mockFlights);
      (flightRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await flightService.findAllPaginated(adminSession as any, { page: 1, limit: 10 });

      expect(result.data).toEqual(mockFlights);
      expect(result.meta.total).toBe(1);
      expect(flightRepository.findMany).toHaveBeenCalled();
    });

    it('should allow passengers to read flights (since they have read permission)', async () => {
      (flightRepository.findMany as jest.Mock).mockResolvedValue([]);
      (flightRepository.count as jest.Mock).mockResolvedValue(0);

      const result = await flightService.findAllPaginated(passengerSession as any);
      expect(result.data).toEqual([]);
    });
  });

  describe('deleteFlight', () => {
    it('should throw UnauthorizedError for passengers', async () => {
      await expect(flightService.deleteFlight('1', passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError if flight does not exist', async () => {
      (flightRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(flightService.deleteFlight('non-existent', adminSession as any))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError if flight has bookings', async () => {
      (flightRepository.findById as jest.Mock).mockResolvedValue({ id: '1', flightCode: 'TG101' });
      (flightRepository.countBookings as jest.Mock).mockResolvedValue(5);

      await expect(flightService.deleteFlight('1', adminSession as any))
        .rejects.toThrow(ConflictError);
    });

    it('should call repository.delete for admin if no bookings exist', async () => {
      (flightRepository.findById as jest.Mock).mockResolvedValue({ id: '1', flightCode: 'TG101' });
      (flightRepository.countBookings as jest.Mock).mockResolvedValue(0);
      (flightRepository.delete as jest.Mock).mockResolvedValue({ id: '1' });

      await flightService.deleteFlight('1', adminSession as any);

      expect(flightRepository.delete).toHaveBeenCalledWith('1');
    });
  });
});

import { flightOpsLogService } from '../services/flight-ops-log.services';
import { flightOpsLogRepository } from '@/repositories/flight-ops-log.repository';
import { flightRepository } from '@/repositories/flight.repository';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

// Mock repositories
jest.mock('@/repositories/flight-ops-log.repository', () => ({
  flightOpsLogRepository: {
    findById: jest.fn(),
    findByFlightId: jest.fn(),
    findAll: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    upsertByFlightId: jest.fn(),
    patchById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

jest.mock('@/repositories/flight.repository', () => ({
  flightRepository: {
    findById: jest.fn(),
  },
}));

describe('flightOpsLogService', () => {
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
    it('should return log if found and authorized', async () => {
      const mockLog = { id: '1', flightId: 'f1', captainName: 'Smith' };
      (flightOpsLogRepository.findById as jest.Mock).mockResolvedValue(mockLog);

      const result = await flightOpsLogService.findById('1', adminSession as any);
      expect(result).toEqual(mockLog);
    });

    it('should throw UnauthorizedError for passengers', async () => {
      await expect(flightOpsLogService.findById('1', passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError if log not found', async () => {
      (flightOpsLogRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(flightOpsLogService.findById('non-existent', adminSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });
});

import { airportService } from '../services/airport.services';
import { airportRepository } from '@/repositories/airport.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';

// Mock repository
jest.mock('@/repositories/airport.repository', () => ({
  airportRepository: {
    findById: jest.fn(),
    findByIataCode: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countRoutes: jest.fn(),
    countStaffAssignments: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessAirport: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && action === 'read') return true;
    return false;
  }),
}));

describe('airportService', () => {
  const adminSession = {
    user: { id: 'admin-id', role: 'ADMIN' },
  };

  const passengerSession = {
    user: { id: 'passenger-id', role: 'PASSENGER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findByIataCode', () => {
    it('should return airport if found', async () => {
      const mockAirport = { id: '1', iataCode: 'BKK', name: 'Suvarnabhumi' };
      (airportRepository.findByIataCode as jest.Mock).mockResolvedValue(mockAirport);

      const result = await airportService.findByIataCode('BKK', passengerSession as any);
      expect(result).toEqual(mockAirport);
    });

    it('should throw NotFoundError if airport not found', async () => {
      (airportRepository.findByIataCode as jest.Mock).mockResolvedValue(null);

      await expect(airportService.findByIataCode('XXX', passengerSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createAirport', () => {
    const createInput = {
      iataCode: 'NEW',
      name: 'New Airport',
      city: 'New City',
      country: 'New Country',
      lat: 10,
      lon: 20,
    };

    it('should create airport for admin', async () => {
      (airportRepository.findByIataCode as jest.Mock).mockResolvedValue(null);
      (airportRepository.create as jest.Mock).mockResolvedValue({ id: 'new-id', ...createInput });

      const result = await airportService.createAirport(createInput, adminSession as any);
      expect(result.iataCode).toBe('NEW');
      expect(airportRepository.create).toHaveBeenCalled();
    });

    it('should throw ConflictError if IATA code already exists', async () => {
      (airportRepository.findByIataCode as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(airportService.createAirport(createInput, adminSession as any))
        .rejects.toThrow(ConflictError);
    });
  });
});

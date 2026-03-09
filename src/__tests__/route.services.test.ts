import { routeService } from '../services/route.services';
import { routeRepository } from '@/repositories/route.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';

// Mock repository
jest.mock('@/repositories/route.repository', () => ({
  routeRepository: {
    findByIdAdmin: jest.fn(),
    findByIdPublic: jest.fn(),
    findByIdForRole: jest.fn(),
    findByIataCodes: jest.fn(),
    findByAirportIds: jest.fn(),
    findAll: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    createWithReturn: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    countActiveFlights: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessRoute: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && action === 'read') return true;
    return false;
  }),
}));

describe('routeService', () => {
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
    it('should return route if found', async () => {
      const mockRoute = { id: '1', distanceKm: 600 };
      (routeRepository.findByIdForRole as jest.Mock).mockResolvedValue(mockRoute);

      const result = await routeService.findById('1', passengerSession as any);
      expect(result).toEqual(mockRoute);
    });

    it('should throw NotFoundError if route not found', async () => {
      (routeRepository.findByIdForRole as jest.Mock).mockResolvedValue(null);

      await expect(routeService.findById('non-existent', passengerSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createRoute', () => {
    const createInput = {
      originAirportId: 'cl00000000000000000000001',
      destAirportId: 'cl00000000000000000000002',
      distanceKm: 600,
      durationMins: 120,
      createReturn: false,
    };

    it('should create route for admin', async () => {
      (routeRepository.findByAirportIds as jest.Mock).mockResolvedValue(null);
      (routeRepository.create as jest.Mock).mockResolvedValue({ id: 'new-id', ...createInput });

      const result = await routeService.createRoute(createInput, adminSession as any);
      expect(result.route.id).toBe('new-id');
    });

    it('should throw ConflictError if route already exists', async () => {
      (routeRepository.findByAirportIds as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(routeService.createRoute(createInput, adminSession as any))
        .rejects.toThrow(ConflictError);
    });
  });
});

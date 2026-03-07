import { bookingService } from '../services/booking.services';
import { bookingRepository } from '@/repositories/booking.repository';
import { flightRepository } from '@/repositories/flight.repository';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

// Mock stripe to avoid fetch errors in node environment
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}));

// Mock paymentService
jest.mock('@/services/payment.services', () => ({
  paymentService: {
    refundBookingForReaccommodation: jest.fn(),
  },
}));

// Mock repositories
jest.mock('@/repositories/booking.repository', () => ({
  bookingRepository: {
    findById: jest.fn(),
    findByBookingRef: jest.fn(),
    findAll: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findByUserId: jest.fn(),
    findByFlightId: jest.fn(),
    findByFlightCode: jest.fn(),
    create: jest.fn(),
    createWithTickets: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('@/repositories/flight.repository', () => ({
  flightRepository: {
    findById: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessBooking: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && (action === 'read' || action === 'create' || action === 'cancel')) return true;
    return false;
  }),
}));

describe('bookingService', () => {
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
    it('should return booking if found and belongs to user', async () => {
      const mockBooking = { id: '1', userId: 'passenger-id', bookingRef: 'BK123' };
      (bookingRepository.findById as jest.Mock).mockResolvedValue(mockBooking);

      const result = await bookingService.findById('1', passengerSession as any);
      expect(result).toEqual(mockBooking);
    });

    it('should throw UnauthorizedError if booking belongs to another user', async () => {
      const mockBooking = { id: '1', userId: 'other-id', bookingRef: 'BK123' };
      (bookingRepository.findById as jest.Mock).mockResolvedValue(mockBooking);

      await expect(bookingService.findById('1', passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should return any booking for admin', async () => {
      const mockBooking = { id: '1', userId: 'other-id', bookingRef: 'BK123' };
      (bookingRepository.findById as jest.Mock).mockResolvedValue(mockBooking);

      const result = await bookingService.findById('1', adminSession as any);
      expect(result).toEqual(mockBooking);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated bookings for admin', async () => {
      const mockBookings = [{ id: '1', bookingRef: 'BK1' }];
      (bookingRepository.findMany as jest.Mock).mockResolvedValue(mockBookings);
      (bookingRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await bookingService.findAllPaginated(adminSession as any);
      expect(result.data).toEqual(mockBookings);
      expect(result.meta.total).toBe(1);
    });

    it('should throw UnauthorizedError for passengers', async () => {
      await expect(bookingService.findAllPaginated(passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});

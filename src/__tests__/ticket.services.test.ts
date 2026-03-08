import { ticketService } from '../services/ticket.services';
import { ticketRepository } from '@/repositories/ticket.repository';
import { UnauthorizedError, NotFoundError, ConflictError } from '@/lib/errors';

// Mock repository
jest.mock('@/repositories/ticket.repository', () => ({
  ticketRepository: {
    findById: jest.fn(),
    findAll: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    findByUserId: jest.fn(),
    findByBookingId: jest.fn(),
    findSeatAssignment: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    checkIn: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessTicket: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && (action === 'read' || action === 'create')) return true;
    return false;
  }),
}));

describe('ticketService', () => {
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
    it('should return ticket if found and belongs to user', async () => {
      const mockTicket = { id: '1', booking: { userId: 'passenger-id' } };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      const result = await ticketService.findById('1', passengerSession as any);
      expect(result).toEqual(mockTicket);
    });

    it('should throw UnauthorizedError if ticket belongs to another user', async () => {
      const mockTicket = { id: '1', booking: { userId: 'other-id' } };
      (ticketRepository.findById as jest.Mock).mockResolvedValue(mockTicket);

      await expect(ticketService.findById('1', passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });
  });

  describe('createTicket', () => {
    const createInput = {
      bookingId: 'cl00000000000000000000001',
      flightId: 'cl00000000000000000000002',
      class: 'ECONOMY' as any,
      price: 1500,
      firstName: 'John',
      lastName: 'Doe',
    };

    it('should create ticket if seat is available', async () => {
      (ticketRepository.findSeatAssignment as jest.Mock).mockResolvedValue(null);
      (ticketRepository.create as jest.Mock).mockResolvedValue({ id: 'new-id', ...createInput });

      const result = await ticketService.createTicket(createInput, passengerSession as any);
      expect(result.id).toBe('new-id');
    });

    it('should throw ConflictError if seat is already assigned', async () => {
      const inputWithSeat = { ...createInput, seatNumber: '12A' };
      (ticketRepository.findSeatAssignment as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(ticketService.createTicket(inputWithSeat, passengerSession as any))
        .rejects.toThrow(ConflictError);
    });
  });
});

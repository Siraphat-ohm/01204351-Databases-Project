/**
 * @jest-environment node
 */
import { paymentService } from '../services/payment.services';
import { paymentRepository } from '@/repositories/payment.repository';
import { bookingRepository } from '@/repositories/booking.repository';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

// Mock mongoose to prevent real connections and open handles
jest.mock('@/lib/mongoose', () => ({
  connectMongo: jest.fn(),
  PaymentLogModel: {
    updateOne: jest.fn().mockReturnValue({ exec: jest.fn() }),
  },
}));

// Mock stripe
jest.mock('@/lib/stripe', () => ({
  stripe: {
    checkout: { sessions: { create: jest.fn() } },
    refunds: { create: jest.fn() },
  },
}));

import { stripe } from '@/lib/stripe';

// Mock repositories
jest.mock('@/repositories/payment.repository', () => ({
  paymentRepository: {
    findById: jest.fn(),
    createPayment: jest.fn(),
    updateStatus: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('@/repositories/booking.repository', () => ({
  bookingRepository: {
    findById: jest.fn(),
    updateStatus: jest.fn(),
  },
}));

jest.mock('@/services/ticket.services', () => ({
  ticketService: {
    findByBookingId: jest.fn(),
  },
}));

// Mock permissions
jest.mock('@/auth/permissions', () => ({
  canAccessPayment: jest.fn((role, action) => {
    if (role === 'ADMIN') return true;
    if (role === 'PASSENGER' && (action === 'create' || action === 'read')) return true;
    return false;
  }),
}));

describe('paymentService', () => {
  const adminSession = {
    user: { id: 'admin-id', role: 'ADMIN' },
  };

  const passengerSession = {
    user: { id: 'passenger-id', role: 'PASSENGER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('markPaymentSuccess', () => {
    it('should update payment and booking status on success', async () => {
      const mockPayment = { id: 'p1', bookingId: 'b1', status: 'PENDING', type: 'PAYMENT' };
      (paymentRepository.findById as jest.Mock).mockResolvedValue(mockPayment);
      (paymentRepository.updateStatus as jest.Mock).mockResolvedValue({ ...mockPayment, status: 'SUCCESS' });

      const result = await paymentService.markPaymentSuccess('p1', { stripeChargeId: 'ch1' }, adminSession as any);
      
      expect(paymentRepository.updateStatus).toHaveBeenCalled();
      expect(bookingRepository.updateStatus).toHaveBeenCalledWith('b1', 'CONFIRMED');
      expect(result.status).toBe('SUCCESS');
    });

    it('should throw NotFoundError if payment record not found', async () => {
      (paymentRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(paymentService.markPaymentSuccess('non-existent', {}, adminSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });
});

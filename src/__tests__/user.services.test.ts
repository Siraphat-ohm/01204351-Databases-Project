import { userService } from '../services/user.services';
import { userRepository } from '@/repositories/user.repository';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

// Mock repository
jest.mock('@/repositories/user.repository', () => ({
  userRepository: {
    findByIdAdmin: jest.fn(),
    findByIdSelf: jest.fn(),
    findAllAdmin: jest.fn(),
    count: jest.fn(),
    updateMyProfile: jest.fn(),
    updateRole: jest.fn(),
    update: jest.fn(),
    createGuestUser: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('userService', () => {
  const adminSession = {
    user: { id: 'admin-id', role: 'ADMIN' },
  };

  const passengerSession = {
    user: { id: 'passenger-id', role: 'PASSENGER' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('findMe', () => {
    it('should return self profile', async () => {
      const mockUser = { id: 'passenger-id', email: 'test@example.com' };
      (userRepository.findByIdSelf as jest.Mock).mockResolvedValue(mockUser);

      const result = await userService.findMe(passengerSession as any);
      expect(result).toEqual(mockUser);
      expect(userRepository.findByIdSelf).toHaveBeenCalledWith('passenger-id');
    });

    it('should throw NotFoundError if self not found', async () => {
      (userRepository.findByIdSelf as jest.Mock).mockResolvedValue(null);

      await expect(userService.findMe(passengerSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated users for admin', async () => {
      const mockUsers = [{ id: '1', email: 'u1@ex.com' }];
      (userRepository.findAllAdmin as jest.Mock).mockResolvedValue(mockUsers);
      (userRepository.count as jest.Mock).mockResolvedValue(1);

      const result = await userService.findAllPaginated(adminSession as any);
      expect(result.data).toEqual(mockUsers);
      expect(result.meta.total).toBe(1);
    });

    it('should throw UnauthorizedError for passengers', async () => {
      await expect(userService.findAllPaginated(passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});

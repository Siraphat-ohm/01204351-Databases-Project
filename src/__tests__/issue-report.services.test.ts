import { issueReportService } from '../services/issue-report.services';
import { issueReportRepository } from '@/repositories/issue-report.repository';
import { userRepository } from '@/repositories/user.repository';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

// Mock repositories
jest.mock('@/repositories/issue-report.repository', () => ({
  issueReportRepository: {
    findById: jest.fn(),
    findByUserId: jest.fn(),
    findAll: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    createForUser: jest.fn(),
    create: jest.fn(),
    updateStatus: jest.fn(),
    updateById: jest.fn(),
    deleteById: jest.fn(),
  },
}));

jest.mock('@/repositories/user.repository', () => ({
  userRepository: {
    findByIdAdmin: jest.fn(),
    findAllAdmin: jest.fn(),
  },
}));

describe('issueReportService', () => {
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
    it('should return issue if found and belongs to user', async () => {
      const mockIssue = { id: '1', userId: 'passenger-id', category: 'booking' };
      const mockUser = { id: 'passenger-id', name: 'Passenger', email: 'passenger@example.com' };
      
      (issueReportRepository.findById as jest.Mock).mockResolvedValue(mockIssue);
      (userRepository.findByIdAdmin as jest.Mock).mockResolvedValue(mockUser);

      const result = await issueReportService.findById('1', passengerSession as any);
      expect(result).toEqual({ ...mockIssue, user: mockUser });
    });

    it('should return issue even if user not found', async () => {
      const mockIssue = { id: '1', userId: 'passenger-id', category: 'booking' };
      
      (issueReportRepository.findById as jest.Mock).mockResolvedValue(mockIssue);
      (userRepository.findByIdAdmin as jest.Mock).mockRejectedValue(new Error('Not found'));

      const result = await issueReportService.findById('1', passengerSession as any);
      expect(result).toEqual({ ...mockIssue, user: null });
    });

    it('should throw UnauthorizedError if issue belongs to another user', async () => {
      const mockIssue = { id: '1', userId: 'other-id', category: 'booking' };
      (issueReportRepository.findById as jest.Mock).mockResolvedValue(mockIssue);

      await expect(issueReportService.findById('1', passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });

    it('should throw NotFoundError if issue not found', async () => {
      (issueReportRepository.findById as jest.Mock).mockResolvedValue(null);

      await expect(issueReportService.findById('non-existent', adminSession as any))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('findAllPaginated', () => {
    it('should return paginated issues with user details', async () => {
      const mockIssues = [
        { id: '1', userId: 'user-1', category: 'booking' },
        { id: '2', userId: 'user-2', category: 'flight' },
      ];
      const mockUsers = [
        { id: 'user-1', name: 'User 1' },
        { id: 'user-2', name: 'User 2' },
      ];

      (issueReportRepository.findMany as jest.Mock).mockResolvedValue(mockIssues);
      (issueReportRepository.count as jest.Mock).mockResolvedValue(2);
      (userRepository.findAllAdmin as jest.Mock).mockResolvedValue(mockUsers);

      const result = await issueReportService.findAllPaginated(adminSession as any, { page: 1, limit: 10 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0].user).toEqual(mockUsers[0]);
      expect(result.data[1].user).toEqual(mockUsers[1]);
      expect(result.meta.total).toBe(2);
    });

    it('should throw UnauthorizedError if not admin', async () => {
      await expect(issueReportService.findAllPaginated(passengerSession as any))
        .rejects.toThrow(UnauthorizedError);
    });
  });
});

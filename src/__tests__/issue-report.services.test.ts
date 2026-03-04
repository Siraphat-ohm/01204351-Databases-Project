import { issueReportService } from '../services/issue-report.services';
import { issueReportRepository } from '@/repositories/issue-report.repository';
import { UnauthorizedError, NotFoundError } from '@/lib/errors';

// Mock repository
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
      (issueReportRepository.findById as jest.Mock).mockResolvedValue(mockIssue);

      const result = await issueReportService.findById('1', passengerSession as any);
      expect(result).toEqual(mockIssue);
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
});

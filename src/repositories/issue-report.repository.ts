import IssueReport from '@/models/IssueReport';
import { connectMongo } from '@/lib/mongoose';
import type {
  CreateIssueReportInput,
  UpdateIssueReportStatusInput,
} from '@/types/issue-report.type';

export const issueReportRepository = {
  async findById(id: string) {
    await connectMongo();
    return IssueReport.findById(id).lean();
  },

  async findByUserId(userId: string) {
    await connectMongo();
    return IssueReport.find({ userId }).sort({ createdAt: -1 }).lean();
  },

  async findAll() {
    await connectMongo();
    return IssueReport.find({}).sort({ createdAt: -1 }).lean();
  },

  async createForUser(userId: string, input: CreateIssueReportInput) {
    await connectMongo();
    return IssueReport.create({
      userId,
      category: input.category,
      description: input.description,
      attachments: input.attachments,
      status: 'open',
    });
  },

  async updateStatus(
    id: string,
    input: UpdateIssueReportStatusInput & { resolvedBy?: string },
  ) {
    await connectMongo();

    const adminResolution =
      (input.status === 'resolved' || input.status === 'closed') && input.resolvedBy
        ? {
            resolvedBy: input.resolvedBy,
            note: input.note ?? 'Resolved by admin',
            resolvedAt: new Date(),
          }
        : undefined;

    return IssueReport.findByIdAndUpdate(
      id,
      {
        $set: {
          status: input.status,
          ...(adminResolution ? { adminResolution } : {}),
        },
      },
      { new: true },
    ).lean();
  },
};

import IssueReport from '@/models/IssueReport';
import { connectMongo } from '@/lib/mongoose';
import type {
  CreateIssueReportAdminInput,
  CreateIssueReportInput,
  UpdateIssueReportInput,
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

  async findAll(args?: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }) {
    await connectMongo();

    const query = IssueReport.find(args?.where ?? {}).sort({ createdAt: -1 });
    if (args?.skip !== undefined) query.skip(args.skip);
    if (args?.take !== undefined) query.limit(args.take);

    return query.lean();
  },

  async findMany(args: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }) {
    await connectMongo();

    const query = IssueReport.find(args.where ?? {}).sort({ createdAt: -1 });
    if (args.skip !== undefined) query.skip(args.skip);
    if (args.take !== undefined) query.limit(args.take);

    return query.lean();
  },

  async count(where?: Record<string, unknown>) {
    await connectMongo();
    return IssueReport.countDocuments(where ?? {});
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

  async create(input: CreateIssueReportAdminInput) {
    await connectMongo();
    return IssueReport.create({
      userId: input.userId,
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

    const updateData: any = { status: input.status };

    if (input.resolvedBy || input.note) {
      updateData.adminResolution = {
        resolvedBy: input.resolvedBy || 'system',
        note: input.note ?? (input.status === 'resolved' || input.status === 'closed' ? 'Resolved by admin' : ''),
        resolvedAt: new Date(),
      };
    }

    return IssueReport.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).lean();
  },

  async updateById(
    id: string,
    input: UpdateIssueReportInput & { resolvedBy?: string },
  ) {
    await connectMongo();

    const updateData: any = {};
    if (input.category !== undefined) updateData.category = input.category;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.attachments !== undefined) updateData.attachments = input.attachments;
    if (input.status !== undefined) updateData.status = input.status;

    if (input.resolvedBy || input.note) {
      updateData.adminResolution = {
        resolvedBy: input.resolvedBy || 'system',
        note: input.note ?? (input.status === 'resolved' || input.status === 'closed' ? 'Resolved by admin' : ''),
        resolvedAt: new Date(),
      };
    }

    return IssueReport.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true },
    ).lean();
  },

  async deleteById(id: string) {
    await connectMongo();
    return IssueReport.findByIdAndDelete(id).lean();
  },
};

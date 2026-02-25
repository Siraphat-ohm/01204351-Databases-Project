import PaymentLog from '@/models/PaymentLog';
import { connectMongo } from '@/lib/mongoose';
import type {
  CreatePaymentLogInput,
  UpdatePaymentLogInput,
} from '@/types/payment-log.type';

export const paymentLogRepository = {
  async findById(id: string) {
    await connectMongo();
    return PaymentLog.findById(id).lean();
  },

  async findByBookingId(bookingId: string) {
    await connectMongo();
    return PaymentLog.find({ bookingId }).sort({ createdAt: -1 }).lean();
  },

  async findAll(args?: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }) {
    await connectMongo();

    const query = PaymentLog.find(args?.where ?? {}).sort({ createdAt: -1 });
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

    const query = PaymentLog.find(args.where ?? {}).sort({ createdAt: -1 });
    if (args.skip !== undefined) query.skip(args.skip);
    if (args.take !== undefined) query.limit(args.take);

    return query.lean();
  },

  async count(where?: Record<string, unknown>) {
    await connectMongo();
    return PaymentLog.countDocuments(where ?? {});
  },

  async create(input: CreatePaymentLogInput) {
    await connectMongo();
    return PaymentLog.create(input);
  },

  async updateById(id: string, input: UpdatePaymentLogInput) {
    await connectMongo();
    return PaymentLog.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true },
    ).lean();
  },
};

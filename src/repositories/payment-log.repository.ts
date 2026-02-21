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

  async findAll() {
    await connectMongo();
    return PaymentLog.find({}).sort({ createdAt: -1 }).lean();
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

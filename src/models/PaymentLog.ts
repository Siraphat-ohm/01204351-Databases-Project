import mongoose, { Schema, Document, Model } from "mongoose";

export type PaymentLogStatus = "pending" | "success" | "failed" | "refunded";
export type PaymentGateway = "stripe" | "promptpay" | "truemoney" | "other";

export interface IPaymentLog extends Document {
  bookingId: string;
  amount: number;
  currency: string;
  status: PaymentLogStatus;
  gateway: PaymentGateway;
  rawResponse: Record<string, unknown>;
}

const PaymentLogSchema = new Schema<IPaymentLog>(
  {
    bookingId: { type: String, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "THB" },
    status: {
      type: String,
      enum: ["pending", "success", "failed", "refunded"],
      required: true,
    },
    gateway: {
      type: String,
      enum: ["stripe", "promptpay", "truemoney", "other"],
      default: "stripe",
    },
    rawResponse: { type: Schema.Types.Mixed },
  },
  {
    timestamps: true,
  },
);

const PaymentLog: Model<IPaymentLog> =
  mongoose.models.PaymentLog ||
  mongoose.model<IPaymentLog>("PaymentLog", PaymentLogSchema);
export default PaymentLog;

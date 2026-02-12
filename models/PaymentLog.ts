import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPaymentLog extends Document {
  mysqlBookingId: number;
  amount: number;
  currency: string;
  status: string;
  gateway: string;
  rawResponse: any;
}

const PaymentLogSchema = new Schema<IPaymentLog>(
  {
    mysqlBookingId: { type: Number, required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "THB" },
    status: { type: String, required: true },
    gateway: { type: String, default: "Stripe" },
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

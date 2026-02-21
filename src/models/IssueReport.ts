import mongoose, { Schema, Document, Model } from "mongoose";

export type IssueStatus = "open" | "investigating" | "resolved" | "closed";

export interface IIssueReport extends Document {
  userId: string;
  category: "booking" | "payment" | "flight" | "baggage" | "other";
  description: string;
  attachments: string[];
  status: IssueStatus;
  adminResolution?: {
    resolvedBy: string;
    note: string;
    resolvedAt: Date;
  };
}

const IssueReportSchema = new Schema<IIssueReport>(
  {
    userId: { type: String, required: true, index: true },
    category: {
      type: String,
      enum: ["booking", "payment", "flight", "baggage", "other"],
      required: true,
    },
    description: { type: String, required: true },
    attachments: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["open", "investigating", "resolved", "closed"],
      default: "open",
    },
    adminResolution: {
      resolvedBy: String,
      note: String,
      resolvedAt: Date,
    },
  },
  { timestamps: true },
);

const IssueReport: Model<IIssueReport> =
  mongoose.models.IssueReport ||
  mongoose.model<IIssueReport>("IssueReport", IssueReportSchema);
export default IssueReport;

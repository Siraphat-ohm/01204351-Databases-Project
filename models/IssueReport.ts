import mongoose, { Schema, Document, Model } from "mongoose";

export interface IIssueReport extends Document {
  mysqlUserId: number;
  category: string;
  description: string;
  attachments: string[];
  status: string;
  adminResolution?: {
    resolvedBy: string;
    note: string;
    resolvedAt: Date;
  };
}

const IssueReportSchema = new Schema<IIssueReport>(
  {
    mysqlUserId: { type: Number, required: true, index: true },
    category: { type: String, required: true },
    description: { type: String, required: true },
    attachments: [String],
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

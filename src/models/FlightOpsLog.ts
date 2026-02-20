import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFlightOpsLog extends Document {
  mysqlFlightId: number;
  captainName: string;
  gateChanges: Array<{ from: string; to: string; time: Date; reason: string }>;
  weatherConditions?: { origin: string; destination: string };
  incidents: string[];
  maintenanceChecklist?: any;
}

const FlightOpsLogSchema = new Schema<IFlightOpsLog>(
  {
    mysqlFlightId: { type: Number, required: true, unique: true },
    captainName: { type: String, required: true },
    gateChanges: [
      {
        from: String,
        to: String,
        time: { type: Date, default: Date.now },
        reason: String,
      },
    ],
    weatherConditions: {
      origin: String,
      destination: String,
    },
    incidents: [String],
    maintenanceChecklist: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

const FlightOpsLog: Model<IFlightOpsLog> =
  mongoose.models.FlightOpsLog ||
  mongoose.model<IFlightOpsLog>("FlightOpsLog", FlightOpsLogSchema);
export default FlightOpsLog;

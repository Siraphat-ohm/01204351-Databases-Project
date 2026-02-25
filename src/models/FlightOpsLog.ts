import mongoose, { Schema, Document, Model } from "mongoose";

export interface IFlightOpsLog extends Document {
  flightId: string;
  captainName: string;
  gateChanges: Array<{ from: string; to: string; time: Date; reason: string }>;
  weatherConditions?: { origin: string; destination: string };
  incidents: string[];
  maintenanceChecklist?: Record<string, unknown>;
}

const FlightOpsLogSchema = new Schema<IFlightOpsLog>(
  {
    flightId: { type: String, required: true, unique: true, index: true },
    captainName: { type: String, required: true },
    gateChanges: [
      {
        from: { type: String, required: true },
        to: { type: String, required: true },
        time: { type: Date, default: Date.now },
        reason: { type: String, required: true },
      },
    ],
    weatherConditions: {
      origin: String,
      destination: String,
    },
    incidents: { type: [String], default: [] },
    maintenanceChecklist: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

const FlightOpsLog: Model<IFlightOpsLog> =
  mongoose.models.FlightOpsLog ||
  mongoose.model<IFlightOpsLog>("FlightOpsLog", FlightOpsLogSchema);
export default FlightOpsLog;

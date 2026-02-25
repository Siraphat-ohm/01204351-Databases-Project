import FlightOpsLog from '@/models/FlightOpsLog';
import { connectMongo } from '@/lib/mongoose';
import type {
  UpsertFlightOpsLogInput,
  PatchFlightOpsLogInput,
} from '@/types/flight-ops-log.type';

export const flightOpsLogRepository = {
  async findById(id: string) {
    await connectMongo();
    return FlightOpsLog.findById(id).lean();
  },

  async findByFlightId(flightId: string) {
    await connectMongo();
    return FlightOpsLog.findOne({ flightId }).lean();
  },

  async findAll() {
    await connectMongo();
    return FlightOpsLog.find({}).sort({ updatedAt: -1 }).lean();
  },

  async upsertByFlightId(flightId: string, input: UpsertFlightOpsLogInput) {
    await connectMongo();
    return FlightOpsLog.findOneAndUpdate(
      { flightId },
      {
        $set: {
          captainName: input.captainName,
          gateChanges: input.gateChanges,
          weatherConditions: input.weatherConditions,
          incidents: input.incidents,
          maintenanceChecklist: input.maintenanceChecklist,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
  },

  async patchById(id: string, input: PatchFlightOpsLogInput) {
    await connectMongo();
    return FlightOpsLog.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true },
    ).lean();
  },
};

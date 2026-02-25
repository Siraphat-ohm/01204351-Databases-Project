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

  async findAll(args?: {
    where?: Record<string, unknown>;
    skip?: number;
    take?: number;
  }) {
    await connectMongo();

    const query = FlightOpsLog.find(args?.where ?? {}).sort({ updatedAt: -1 });
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

    const query = FlightOpsLog.find(args.where ?? {}).sort({ updatedAt: -1 });
    if (args.skip !== undefined) query.skip(args.skip);
    if (args.take !== undefined) query.limit(args.take);

    return query.lean();
  },

  async count(where?: Record<string, unknown>) {
    await connectMongo();
    return FlightOpsLog.countDocuments(where ?? {});
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

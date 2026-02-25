import CrewProfile from '@/models/CrewProfile';
import { connectMongo } from '@/lib/mongoose';
import type {
  CreateCrewProfileInput,
  UpsertCrewProfileInput,
  PatchCrewProfileInput,
  UpdateCrewProfileInput,
} from '@/types/crew-profile.type';

type CrewProfileWhere = Partial<{
  userId: string;
}>;

type CrewProfileFindManyArgs = {
  where?: CrewProfileWhere;
  skip?: number;
  take?: number;
};

export const crewProfileRepository = {
  async findAll(args?: CrewProfileFindManyArgs) {
    await connectMongo();

    const query = args?.where ?? {};
    const skip = args?.skip ?? 0;
    const take = args?.take;

    const finder = CrewProfile.find(query).sort({ createdAt: -1 }).skip(skip);
    if (typeof take === 'number') finder.limit(take);
    return finder.lean();
  },

  async findMany(args: CrewProfileFindManyArgs) {
    return this.findAll(args);
  },

  async count(where?: CrewProfileWhere) {
    await connectMongo();
    return CrewProfile.countDocuments(where ?? {});
  },

  async findByUserId(userId: string) {
    await connectMongo();
    return CrewProfile.findOne({ userId }).lean();
  },

  async create(input: CreateCrewProfileInput) {
    await connectMongo();
    const created = await CrewProfile.create(input);
    return CrewProfile.findById(created._id).lean();
  },

  async upsertByUserId(userId: string, input: UpsertCrewProfileInput) {
    await connectMongo();
    return CrewProfile.findOneAndUpdate(
      { userId },
      {
        $set: {
          nickname: input.nickname,
          languages: input.languages,
          certifications: input.certifications,
          flightHours: input.flightHours,
        },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    ).lean();
  },

  async patchByUserId(userId: string, input: PatchCrewProfileInput) {
    await connectMongo();

    const setPayload: Record<string, unknown> = {};
    if (input.nickname !== undefined) setPayload.nickname = input.nickname;
    if (input.languages !== undefined) setPayload.languages = input.languages;
    if (input.certifications !== undefined) {
      setPayload.certifications = input.certifications;
    }
    if (input.flightHours !== undefined) setPayload.flightHours = input.flightHours;

    return CrewProfile.findOneAndUpdate(
      { userId },
      { $set: setPayload },
      { new: true },
    ).lean();
  },

  async updateByUserId(userId: string, input: UpdateCrewProfileInput) {
    await connectMongo();

    const setPayload: Record<string, unknown> = {};
    if (input.nickname !== undefined) setPayload.nickname = input.nickname;
    if (input.languages !== undefined) setPayload.languages = input.languages;
    if (input.certifications !== undefined) {
      setPayload.certifications = input.certifications;
    }
    if (input.flightHours !== undefined) setPayload.flightHours = input.flightHours;

    return CrewProfile.findOneAndUpdate(
      { userId },
      { $set: setPayload },
      { new: true },
    ).lean();
  },

  async deleteByUserId(userId: string) {
    await connectMongo();
    return CrewProfile.findOneAndDelete({ userId }).lean();
  },
};

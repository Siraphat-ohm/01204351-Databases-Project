import CrewProfile from '@/models/CrewProfile';
import { connectMongo } from '@/lib/mongoose';
import type {
  UpsertCrewProfileInput,
  PatchCrewProfileInput,
} from '@/types/crew-profile.type';

export const crewProfileRepository = {
  async findByUserId(userId: string) {
    await connectMongo();
    return CrewProfile.findOne({ userId }).lean();
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
};

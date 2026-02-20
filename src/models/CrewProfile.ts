import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICrewProfile extends Document {
  mysqlUserId: number;
  nickname?: string;
  languages: string[];
  certifications: Array<{ name: string; expireDate: Date }>;
  flightHours: number;
}

const CrewProfileSchema = new Schema<ICrewProfile>(
  {
    mysqlUserId: { type: Number, required: true, unique: true },
    nickname: String,
    languages: [String],
    certifications: [
      {
        name: String,
        expireDate: Date,
      },
    ],
    flightHours: { type: Number, default: 0 },
  },
  { timestamps: true },
);

const CrewProfile: Model<ICrewProfile> =
  mongoose.models.CrewProfile ||
  mongoose.model<ICrewProfile>("CrewProfile", CrewProfileSchema);
export default CrewProfile;

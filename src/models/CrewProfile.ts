import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICrewProfile extends Document {
  userId: string;
  nickname?: string;
  languages: string[];
  certifications: Array<{ name: string; expireDate: Date }>;
  flightHours: number;
}

const CrewProfileSchema = new Schema<ICrewProfile>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    nickname: { type: String },
    languages: { type: [String], default: [] },
    certifications: [
      {
        name: { type: String, required: true },
        expireDate: { type: Date, required: true },
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

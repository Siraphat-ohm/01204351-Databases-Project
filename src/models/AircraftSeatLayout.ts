import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────
// AircraftSeatLayout — template for each aircraft type
// One document per aircraft type (e.g. "320" = A320-200).
// Defines the physical cabin layout that gets stamped onto
// every FlightSeatMap when a flight is created.
// ─────────────────────────────────────────────────────────────

export interface ISeatDef {
  label: string; // e.g. "12A"
  cabin: "FIRST" | "BUSINESS" | "ECONOMY";
  row: number;
  column: string; // e.g. "A"
  type: "STANDARD" | "WINDOW" | "MIDDLE" | "AISLE" | "EXIT_ROW" | "EXTRA_LEGROOM";
  available: boolean; // false = physically blocked (e.g. missing seat at row 13)
  surcharge: number; // default surcharge for premium seat positions
}

export interface ICabinSection {
  cabin: "FIRST" | "BUSINESS" | "ECONOMY";
  rowStart: number;
  rowEnd: number;
  columns: string[]; // e.g. ["A","B","C","D","E","F"]
  aisleAfter: string[]; // columns after which there's an aisle, e.g. ["C"]
}

export interface IAircraftSeatLayout extends Document {
  aircraftTypeIataCode: string; // FK → AircraftType.iataCode in Postgres
  aircraftModel: string; // e.g. "Airbus A320-200"
  totalCapacity: number;
  cabins: ICabinSection[];
  seats: ISeatDef[];
}

const SeatDefSchema = new Schema<ISeatDef>(
  {
    label: { type: String, required: true },
    cabin: {
      type: String,
      enum: ["FIRST", "BUSINESS", "ECONOMY"],
      required: true,
    },
    row: { type: Number, required: true },
    column: { type: String, required: true },
    type: {
      type: String,
      enum: ["STANDARD", "WINDOW", "MIDDLE", "AISLE", "EXIT_ROW", "EXTRA_LEGROOM"],
      default: "STANDARD",
    },
    available: { type: Boolean, default: true },
    surcharge: { type: Number, default: 0 },
  },
  { _id: false },
);

const CabinSectionSchema = new Schema<ICabinSection>(
  {
    cabin: {
      type: String,
      enum: ["FIRST", "BUSINESS", "ECONOMY"],
      required: true,
    },
    rowStart: { type: Number, required: true },
    rowEnd: { type: Number, required: true },
    columns: { type: [String], required: true },
    aisleAfter: { type: [String], default: [] },
  },
  { _id: false },
);

const AircraftSeatLayoutSchema = new Schema<IAircraftSeatLayout>(
  {
    aircraftTypeIataCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    aircraftModel: { type: String, required: true },
    totalCapacity: { type: Number, required: true },
    cabins: { type: [CabinSectionSchema], required: true },
    seats: { type: [SeatDefSchema], required: true },
  },
  { timestamps: true },
);

const AircraftSeatLayout: Model<IAircraftSeatLayout> =
  mongoose.models.AircraftSeatLayout ||
  mongoose.model<IAircraftSeatLayout>(
    "AircraftSeatLayout",
    AircraftSeatLayoutSchema,
  );

export default AircraftSeatLayout;

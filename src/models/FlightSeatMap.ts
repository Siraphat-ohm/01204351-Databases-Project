import mongoose, { Schema, Document, Model } from "mongoose";

// ─────────────────────────────────────────────────────────────
// FlightSeatMap — per-flight seat availability & state
// Created when a flight is created by stamping the matching
// AircraftSeatLayout template. Updated in real-time as
// passengers hold / book / release seats.
// ─────────────────────────────────────────────────────────────

export type SeatStatus = "AVAILABLE" | "HELD" | "OCCUPIED" | "BLOCKED";

export interface IFlightSeat {
  label: string; // e.g. "12A"
  cabin: "FIRST" | "BUSINESS" | "ECONOMY";
  row: number;
  column: string;
  type: "STANDARD" | "WINDOW" | "MIDDLE" | "AISLE" | "EXIT_ROW" | "EXTRA_LEGROOM";
  status: SeatStatus;
  surcharge: number;
  ticketId?: string; // Prisma Ticket.id — set when OCCUPIED
  heldBy?: string; // Prisma User.id — set when HELD
  holdExpiry?: Date; // auto-release after this time
}

export interface IFlightSeatMap extends Document {
  flightId: string; // FK → Flight.id in Postgres
  aircraftTypeIataCode: string;
  totalSeats: number;
  availableSeats: number;
  seats: IFlightSeat[];
  createdAt: Date;
  updatedAt: Date;
}

const FlightSeatSchema = new Schema<IFlightSeat>(
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
    status: {
      type: String,
      enum: ["AVAILABLE", "HELD", "OCCUPIED", "BLOCKED"],
      default: "AVAILABLE",
    },
    surcharge: { type: Number, default: 0 },
    ticketId: { type: String, default: null },
    heldBy: { type: String, default: null },
    holdExpiry: { type: Date, default: null },
  },
  { _id: false },
);

const FlightSeatMapSchema = new Schema<IFlightSeatMap>(
  {
    flightId: { type: String, required: true, unique: true, index: true },
    aircraftTypeIataCode: { type: String, required: true },
    totalSeats: { type: Number, required: true },
    availableSeats: { type: Number, required: true },
    seats: { type: [FlightSeatSchema], required: true },
  },
  { timestamps: true },
);

// ── Compound index for querying available seats by cabin ─────
FlightSeatMapSchema.index({ flightId: 1, "seats.cabin": 1 });

const FlightSeatMap: Model<IFlightSeatMap> =
  mongoose.models.FlightSeatMap ||
  mongoose.model<IFlightSeatMap>("FlightSeatMap", FlightSeatMapSchema);

export default FlightSeatMap;

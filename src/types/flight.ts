import { FlightStatus, AircraftStatus } from "@/generated/prisma/client";

export interface FlightWithDetails {
  id: number;
  flightCode: string;
  departureTime: Date;
  arrivalTime: Date;
  status: FlightStatus;
  gate: string;
  basePrice: number;
  route: {
    origin: { iataCode: string; city: string };
    destination: { iataCode: string; city: string };
    durationMins: number;
  };
  aircraft: {
    tailNumber: string;
    model: string;
  };
}

export interface FlightQueryParams {
  origin?: string;
  destination?: string;
  date?: string;
  status?: FlightStatus;
  page?: number;
  limit?: number;
}

export interface FlightSearchParams {
  page?: string | number;
  limit?: string | number;
  origin?: string;
  destination?: string;
  date?: string;
  status?: FlightStatus;
}

export interface CreateFlightInput {
  flightCode: string;
  routeId: number;
  aircraftId: number;
  captainId?: number;
  gate?: string;
  departureTime: Date;
  arrivalTime: Date;
  basePrice: number | string;
  status?: FlightStatus;
}

export interface UpdateFlightInput {
  flightCode?: string;
  routeId?: number;
  aircraftId?: number;
  captainId?: number | null;
  gate?: string | null;
  departureTime?: Date;
  arrivalTime?: Date;
  basePrice?: number | string;
  status?: FlightStatus;
}

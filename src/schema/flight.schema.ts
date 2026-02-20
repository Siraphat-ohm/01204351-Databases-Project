import { z } from "zod";
import { FlightStatus } from "@/generated/prisma/client";

export const FlightCodeSearchSchema = z.object({
  flightCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^YK\d{5}$/, "Flight code must match format YK00000"),
});

export const FlightSearchSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  originIataCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Must be a valid 3-letter IATA code")
    .optional(),
  destinationIataCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, "Must be a valid 3-letter IATA code")
    .optional(),
  departureDate: z.string().date("Must be a valid date YYYY-MM-DD").optional(),
  status: z
    .enum(Object.values(FlightStatus) as [string, ...string[]])
    .optional(),
});

export type FlightCodeSearchParams = z.infer<typeof FlightCodeSearchSchema>;
export type FlightSearchParams = z.infer<typeof FlightSearchSchema>;

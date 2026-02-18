import { FlightTable } from "@/components/FlightTable";
import { FlightService } from "@/lib/services/backoffice/flight";
import { FlightStatus } from "@/generated/prisma/client";
import { FlightSearchParams } from "@/types/flight";

// Extend the search params to include flightCode based on your new service
interface BackofficeFlightSearchParams extends FlightSearchParams {
  flightCode?: string;
}

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const page = Number(resolvedParams.page) || 1;
  const limit = 30;

  // Map URL params to the Service Interface
  const serviceParams: BackofficeFlightSearchParams = {
    page,
    limit,
    status: resolvedParams.status as FlightStatus,
    origin: resolvedParams.origin as string,
    destination: resolvedParams.destination as string,
    date: resolvedParams.date as string,
    flightCode: resolvedParams.flightCode as string,
  };

  // Call the service
  const { data: rawFlights, meta } = await FlightService.getAllFlights(serviceParams);

  // MAPPING DATA: Transform Backend Type -> Frontend Type
  // This explicitly flattens nested objects (like aircraft.type.model) 
  // and converts Decimals to numbers for the UI.
  const tableData = rawFlights.map((flight) => ({
    id: flight.id,
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate ?? "", 
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    
    // Handle Prisma Decimal conversion safely
    // (Using Number() handles both Decimal.js objects and strings if they are serialized)
    basePrice: Number(flight.basePrice), 

    route: {
      origin: {
        iataCode: flight.route.origin.iataCode,
        city: flight.route.origin.city,
      },
      destination: {
        iataCode: flight.route.destination.iataCode,
        city: flight.route.destination.city,
      },
      durationMins: flight.route.durationMins ?? 0, 
    },
    aircraft: {
      tailNumber: flight.aircraft.tailNumber,
      // Flatten the nested relation for the table
      model: flight.aircraft.type.model, 
    },
  }));

  return (
    <FlightTable 
      data={tableData} 
      totalPages={meta.totalPages ?? 1} 
    />
  );
}
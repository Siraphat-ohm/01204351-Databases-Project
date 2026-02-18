import { FlightTable } from "@/components/FlightTable";
import { FlightService } from "@/lib/services/backoffice/flight";
import { FlightStatus } from "@/generated/prisma/client";
import { FlightSearchParams } from "@/types/flight";

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

  const serviceParams: BackofficeFlightSearchParams = {
    page,
    limit,
    status: resolvedParams.status as FlightStatus,
    origin: resolvedParams.origin as string,
    destination: resolvedParams.destination as string,
    date: resolvedParams.date as string,
    flightCode: resolvedParams.flightCode as string,
  };

  const { data: rawFlights, meta } = await FlightService.getAllFlights(serviceParams);

  // MAPPING DATA: Pass full details to the UI
  const tableData = rawFlights.map((flight) => ({
    id: flight.id,
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate ?? null, 
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    basePrice: Number(flight.basePrice),
    captainId: flight.captainId, // Pass ID to check assignment

    route: {
      distanceKm: flight.route.distanceKm,
      durationMins: flight.route.durationMins ?? 0,
      origin: {
        iataCode: flight.route.origin.iataCode,
        city: flight.route.origin.city,
        name: flight.route.origin.name,       // ✅ New
        country: flight.route.origin.country, // ✅ New
      },
      destination: {
        iataCode: flight.route.destination.iataCode,
        city: flight.route.destination.city,
        name: flight.route.destination.name,       // ✅ New
        country: flight.route.destination.country, // ✅ New
      },
    },
    aircraft: {
      tailNumber: flight.aircraft.tailNumber,
      model: flight.aircraft.type.model,
      status: flight.aircraft.status, // ✅ New (ACTIVE/MAINTENANCE)
    },
  }));

  return (
    <FlightTable 
      data={tableData} 
      totalPages={meta.totalPages ?? 1} 
    />
  );
}
// app/dashboard/flights/page.tsx
import { FlightTable } from "@/components/FlightTable";
import { FlightService } from "@/lib/services/flight.service"; 
import { FlightStatus } from "@/generated/prisma/client";
import { FlightSearchParams } from "@/types/flight";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const page = Number(resolvedParams.page) || 1;
  const limit = 30;

  // Map URL params to the existing Service Interface
  const serviceParams: FlightSearchParams = {
    page,
    limit,
    status: resolvedParams.status as FlightStatus,
    origin: resolvedParams.origin as string,
    // ✅ NEW: Pass Destination and Date to service
    destination: resolvedParams.destination as string,
    date: resolvedParams.date as string,
  };

  const { data: rawFlights, meta } = await FlightService.getFlights(serviceParams);

  // MAPPING DATA
  const tableData = rawFlights.map((flight) => ({
    id: flight.id,
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate ?? "", 
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    basePrice: flight.basePrice.toNumber(), 

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
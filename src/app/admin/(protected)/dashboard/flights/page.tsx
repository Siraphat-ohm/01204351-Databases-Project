import { FlightTable } from "@/components/FlightTable";
import { redirect } from "next/navigation";

import { flightService } from "@/services/flight.services"; 
import { getServerSession } from "@/services/auth.services"; 

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // Fetch all flights securely
  const rawFlights = await flightService.findAll(session as any);

  // Read URL Parameters
  const flightCodeSearch = typeof resolvedParams.flightCode === 'string' ? resolvedParams.flightCode.toLowerCase() : '';
  const originSearch = typeof resolvedParams.origin === 'string' ? resolvedParams.origin.toLowerCase() : '';
  const destSearch = typeof resolvedParams.destination === 'string' ? resolvedParams.destination.toLowerCase() : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const dateValue = typeof resolvedParams.date === 'string' ? resolvedParams.date : '';

  const page = Number(resolvedParams.page) || 1;
  const limit = 15; // Set pagination limit

  // 1. Handle Search & Filtering natively on the Server
  const filteredFlights = rawFlights.filter((flight: any) => {
    let matches = true;

    if (flightCodeSearch) matches = matches && flight.flightCode.toLowerCase().includes(flightCodeSearch);
    if (originSearch) matches = matches && flight.route?.origin?.iataCode.toLowerCase() === originSearch;
    if (destSearch) matches = matches && flight.route?.destination?.iataCode.toLowerCase() === destSearch;
    if (statusFilter) matches = matches && flight.status === statusFilter;
    
    // Simple Date Match (YYYY-MM-DD against ISO String)
    if (dateValue && flight.departureTime) {
      const flightDateStr = new Date(flight.departureTime).toISOString().split('T')[0];
      matches = matches && flightDateStr === dateValue;
    }

    return matches;
  });

  // 2. Handle Pagination Calculation
  const totalPages = Math.ceil(filteredFlights.length / limit) || 1;
  const skip = (page - 1) * limit;
  const paginatedFlights = filteredFlights.slice(skip, skip + limit);

  // 3. Map Data safely for the UI
  const tableData = paginatedFlights.map((flight: any) => ({
    id: flight.id, 
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate ?? null, 
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    basePrice: Number(flight.basePriceEconomy ?? 0), 
    captainId: flight.captainId, 
    route: {
      distanceKm: flight.route?.distanceKm ?? 0,
      durationMins: flight.route?.durationMins ?? 0,
      origin: {
        iataCode: flight.route?.origin?.iataCode,
        city: flight.route?.origin?.city,
        name: flight.route?.origin?.name,      
        country: flight.route?.origin?.country, 
      },
      destination: {
        iataCode: flight.route?.destination?.iataCode,
        city: flight.route?.destination?.city,
        name: flight.route?.destination?.name,      
        country: flight.route?.destination?.country, 
      },
    },
    aircraft: {
      tailNumber: flight.aircraft?.tailNumber,
      model: flight.aircraft?.type?.model,
      status: flight.aircraft?.status, 
    },
  }));

  return (
    <FlightTable 
      data={tableData} 
      totalPages={totalPages} 
    />
  );
}
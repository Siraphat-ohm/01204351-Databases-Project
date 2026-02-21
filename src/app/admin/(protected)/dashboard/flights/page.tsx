// app/dashboard/flights/page.tsx

import { FlightTable } from "@/components/FlightTable";
import { redirect } from "next/navigation";

import { flightService } from "@/services/flight.services"; 
import { FlightStatus } from "@/generated/prisma/client";
import { getServerSession } from "@/services/auth.services"; // New auth utility

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  // 1. Await params for Next.js 15+ compatibility
  const resolvedParams = await searchParams;

  // 2. Fetch session and protect route
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  // 3. Fetch all flights securely via RBAC
  const rawFlights = await flightService.findAll(session as any);

  // 4. Handle Search & Filtering (In-memory since findAll returns the full list)
  let filteredFlights = rawFlights;

  if (resolvedParams.flightCode) {
    const code = String(resolvedParams.flightCode).toLowerCase();
    filteredFlights = filteredFlights.filter((f: any) => 
      f.flightCode.toLowerCase().includes(code)
    );
  }

  if (resolvedParams.status) {
    filteredFlights = filteredFlights.filter((f: any) => 
      f.status === resolvedParams.status
    );
  }

  // 5. Handle Pagination
  const page = Number(resolvedParams.page) || 1;
  const limit = 30;
  const totalPages = Math.ceil(filteredFlights.length / limit) || 1;
  const paginatedFlights = filteredFlights.slice((page - 1) * limit, page * limit);

  // 6. MAPPING DATA: Pass full details to the UI
  const tableData = paginatedFlights.map((flight: any) => ({
    id: flight.id, // Now a string CUID
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate ?? null, 
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    
    // Fallback to basePriceEconomy so the table UI doesn't break
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
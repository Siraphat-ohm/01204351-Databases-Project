import { FlightTable } from "@/components/FlightTable";
import { redirect } from "next/navigation";
import { flightService } from "@/services/flight.services"; 
import { userService } from "@/services/user.services"; 
import { getServerSession } from "@/services/auth.services"; 
import type { Prisma } from "@/generated/prisma/client";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function FlightsPage({ searchParams }: PageProps) {
  const session = await getServerSession();
  
  if (!session) {
    redirect('/admin/login');
  }

  const resolvedParams = await searchParams;

  // Read URL Parameters
  const flightCodeSearch = typeof resolvedParams.flightCode === 'string' ? resolvedParams.flightCode : '';
  const originSearch = typeof resolvedParams.origin === 'string' ? resolvedParams.origin : '';
  const destSearch = typeof resolvedParams.destination === 'string' ? resolvedParams.destination : '';
  const statusFilter = typeof resolvedParams.status === 'string' ? resolvedParams.status : '';
  const dateValue = typeof resolvedParams.date === 'string' ? resolvedParams.date : '';

  const page = Number(resolvedParams.page) || 1;
  const limit = 15; 

  // 1. Build the Prisma Where Clause natively
  const where: Prisma.FlightWhereInput = {};

  if (flightCodeSearch) {
    where.flightCode = { contains: flightCodeSearch, mode: 'insensitive' };
  }

  if (originSearch || destSearch) {
    where.route = {};
    if (originSearch) {
      where.route.origin = { iataCode: { equals: originSearch, mode: 'insensitive' } };
    }
    if (destSearch) {
      where.route.destination = { iataCode: { equals: destSearch, mode: 'insensitive' } };
    }
  }

  if (statusFilter) {
    where.status = statusFilter as any; 
  }

  if (dateValue) {
    const startOfDay = new Date(`${dateValue}T00:00:00.000Z`);
    const endOfDay = new Date(`${dateValue}T23:59:59.999Z`);
    
    where.departureTime = {
      gte: startOfDay,
      lte: endOfDay,
    };
  }

  // 2. Fetch paginated flights
  const response = await flightService.findAllPaginated(session as any, { 
    page, 
    limit, 
    where 
  } as any);

  // 🌟 3. FETCH REAL CAPTAIN NAMES & IMAGES 🌟
  const captainUserIds = [...new Set(response.data.map((f: any) => f.captain?.userId).filter(Boolean))];
  
  // Update Dictionary to hold an object with name and image
  let userDict: Record<string, { name: string; image: string | null }> = {};
  
  if (captainUserIds.length > 0) {
    const usersResponse = await userService.findAllPaginated(session as any, {
      limit: 100, 
      where: { id: { in: captainUserIds as string[] } }
    } as any);

    userDict = usersResponse.data.reduce((acc: Record<string, { name: string; image: string | null }>, user: any) => {
      acc[user.id] = {
        name: user.name || user.email.split('@')[0],
        image: user.image || null, // 🌟 Extract the image
      };
      return acc;
    }, {});
  }

  // 4. Map Data safely for the UI
  const tableData = response.data.map((flight: any) => ({
    id: flight.id, 
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate ?? null, 
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    basePrice: Number(flight.basePriceEconomy ?? 0), 
    captainId: flight.captainId, 
    
    // 🌟 Inject both the real captain name AND image
    captainName: flight.captain?.userId ? userDict[flight.captain.userId]?.name : null,
    captainImage: flight.captain?.userId ? userDict[flight.captain.userId]?.image : null,
    
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
      totalPages={response.meta.totalPages} 
    />
  );
}
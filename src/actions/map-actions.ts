"use server";

import { headers } from "next/headers";
import { FlightRoute } from '@/components/LiveRouteMap'; 
import { flightService } from '@/services/flight.services'; 
import { auth } from '@/lib/auth';

// 1. You no longer need the AIRPORT_COORDS dictionary! 🎉

// Define flights that will ALWAYS display (for presentation/showcase)
const SHOWCASE_FLIGHTS: FlightRoute[] = [
  // Note: Map libraries usually expect [longitude, latitude]
  { id: 'showcase-bkk-nrt', fromCode: 'BKK', fromCoords: [100.7501, 13.6811], toCode: 'NRT', toCoords: [140.3929, 35.7720], status: 'ACTIVE' },
  { id: 'showcase-lhr-jfk', fromCode: 'LHR', fromCoords: [-0.4543, 51.4700], toCode: 'JFK', toCoords: [-73.7781, 40.6413], status: 'ACTIVE' },
  { id: 'showcase-cdg-hkg', fromCode: 'CDG', fromCoords: [2.5479, 49.0097], toCode: 'HKG', toCoords: [113.9145, 22.3080], status: 'SCHEDULED' },
];

export async function fetchLiveMapData(): Promise<FlightRoute[]> {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return SHOWCASE_FLIGHTS;
  }

  try {
    const rawFlights = await flightService.findAll(sessionResponse.user as any); 

    const now = new Date();
    const dbMapRoutes: FlightRoute[] = [];

    for (const flight of rawFlights) {
      if (dbMapRoutes.length >= 100) break;

      const depTime = new Date(flight.departureTime);
      
      if (depTime > now) {
        // Access the full airport objects directly from your nested Prisma relation
        const origin = flight.route.origin;
        const destination = flight.route.destination;

        const mapStatus = ['DEPARTED', 'BOARDING'].includes(flight.status) 
          ? 'ACTIVE' 
          : 'SCHEDULED';

        dbMapRoutes.push({
          id: flight.id,
          fromCode: origin.iataCode,
          // Use DB coordinates! 
          // Note: Ensure your map component expects [longitude, latitude] as most do
          fromCoords: [origin.lon, origin.lat], 
          toCode: destination.iataCode,
          toCoords: [destination.lon, destination.lat],
          status: mapStatus,
        });
      }
    }

    return [...SHOWCASE_FLIGHTS, ...dbMapRoutes];

  } catch (error) {
    console.error("Error fetching live map data:", error);
    return SHOWCASE_FLIGHTS;
  }
}
"use server";

import { FlightRoute } from '@/components/LiveRouteMap'; // Adjust path if using LiveMapbox instead
import { FlightService } from '@/lib/services/backoffice/flight';

// Temporary lookup: Mapbox/React-Simple-Maps needs coordinates.
const AIRPORT_COORDS: Record<string, [number, number]> = {
  'AER': [39.9566, 43.4499],
  'KZN': [49.2787, 55.6062],
  'BKK': [100.7501, 13.6811],
  'KBV': [98.9867, 8.0972],
  'HKT': [98.3169, 8.1132],
  'HKG': [113.9145, 22.3080],
  'HDY': [100.3930, 6.9332],
  'CDG': [2.5479, 49.0097],
  'KUL': [101.7099, 2.7456],
  'USM': [100.0615, 9.5583],
  'ICN': [126.4407, 37.4602],
  'TPE': [121.2328, 25.0797],
  'NRT': [140.3929, 35.7720],
  'JFK': [-73.7781, 40.6413],
  'LHR': [-0.4543, 51.4700],
};

// 1. Define flights that will ALWAYS display (for presentation/showcase)
const SHOWCASE_FLIGHTS: FlightRoute[] = [
  { id: 'showcase-bkk-nrt', fromCode: 'BKK', fromCoords: [100.7501, 13.6811], toCode: 'NRT', toCoords: [140.3929, 35.7720], status: 'ACTIVE' },
  { id: 'showcase-lhr-jfk', fromCode: 'LHR', fromCoords: [-0.4543, 51.4700], toCode: 'JFK', toCoords: [-73.7781, 40.6413], status: 'ACTIVE' },
  { id: 'showcase-cdg-hkg', fromCode: 'CDG', fromCoords: [2.5479, 49.0097], toCode: 'HKG', toCoords: [113.9145, 22.3080], status: 'SCHEDULED' },
];

export async function fetchLiveMapData(): Promise<FlightRoute[]> {
  // 2. Fetch data from DB. We fetch a bit more than 100 so we have enough after filtering.
  const { data: rawFlights } = await FlightService.getAllFlights({ limit: 500 }); 

  const now = new Date();
  const dbMapRoutes: FlightRoute[] = [];

  // 3. Process flights and enforce the 100 limit
  for (const flight of rawFlights) {
    // Break the loop early if we already found 100 departing flights
    if (dbMapRoutes.length >= 100) break;

    const depTime = new Date(flight.departureTime);
    
    // Only include flights where departureTime is in the future
    if (depTime > now) {
      const originCode = flight.route.origin.iataCode;
      const destCode = flight.route.destination.iataCode;

      // Map the Prisma FlightStatus to Map Component Status
      // (Assuming DEPARTED or BOARDING should look 'ACTIVE' on the map)
      const mapStatus = ['DEPARTED', 'BOARDING'].includes(flight.status) 
        ? 'ACTIVE' 
        : 'SCHEDULED';

      dbMapRoutes.push({
        id: flight.id.toString(),
        fromCode: originCode,
        fromCoords: AIRPORT_COORDS[originCode] || [0, 0], // Fallback to 0,0 if not found
        toCode: destCode,
        toCoords: AIRPORT_COORDS[destCode] || [0, 0],
        status: mapStatus,
      });
    }
  }

  // 4. Return combined array: Showcase Flights first, then the Real DB Flights
  return [...SHOWCASE_FLIGHTS, ...dbMapRoutes];
}
import { AirportManagement, Airport } from '@/components/AirportManagement';

// --- Mock Service (Simulating Database Call) ---
async function getAirports(): Promise<Airport[]> {
  // Simulate Network Latency
  await new Promise((resolve) => setTimeout(resolve, 600));

  // Mock Data based on your Prisma Schema
  return [
    { id: 1, iataCode: 'BKK', name: 'Suvarnabhumi Airport', city: 'Bangkok', country: 'Thailand' },
    { id: 2, iataCode: 'DMK', name: 'Don Mueang International Airport', city: 'Bangkok', country: 'Thailand' },
    { id: 3, iataCode: 'CNX', name: 'Chiang Mai International Airport', city: 'Chiang Mai', country: 'Thailand' },
    { id: 4, iataCode: 'HKT', name: 'Phuket International Airport', city: 'Phuket', country: 'Thailand' },
    { id: 5, iataCode: 'NRT', name: 'Narita International Airport', city: 'Tokyo', country: 'Japan' },
    { id: 6, iataCode: 'HND', name: 'Haneda Airport', city: 'Tokyo', country: 'Japan' },
    { id: 7, iataCode: 'SIN', name: 'Changi Airport', city: 'Singapore', country: 'Singapore' },
    { id: 8, iataCode: 'LHR', name: 'Heathrow Airport', city: 'London', country: 'United Kingdom' },
    { id: 9, iataCode: 'CDG', name: 'Charles de Gaulle Airport', city: 'Paris', country: 'France' },
    { id: 10, iataCode: 'JFK', name: 'John F. Kennedy International Airport', city: 'New York', country: 'United States' },
  ];
}

export default async function AirportsPage() {
  // 1. Fetch data on the server
  const airportData = await getAirports();

  // 2. Pass data to Client Component
  return (
    <AirportManagement initialAirports={airportData} />
  );
}
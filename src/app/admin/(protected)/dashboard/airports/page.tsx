import { AirportManagement } from '@/components/AirportManagement';
import { airportService } from '@/services/airport.services'; // Adjust path
import { getServerSession } from '@/services/auth.services'; // Adjust path
import { redirect } from 'next/navigation';

export default async function AirportsPage() {
  // 1. Authenticate Request
  const session = await getServerSession();
  if (!session) redirect('/admin/login');

  // 2. Fetch Data from DB
  const airports = await airportService.findAll(session as any);

  // 3. Pass Data to Client Component
  return (
    <AirportManagement initialAirports={airports as any} />
  );
}
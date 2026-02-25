// app/dashboard/aircraft/page.tsx

import { AircraftManagement } from '@/components/AircraftManagement';
import { redirect } from 'next/navigation';

// Import your services
import { aircraftService } from '@/services/aircraft.services'; 
import { aircraftTypeService } from '@/services/aircraft-type.services'; 

// Import your clean auth utility
import { getServerSession } from '@/services/auth.services';

export default async function AircraftPage() {
  // 1. Get the session securely (No headers() boilerplate needed!)
  const session = await getServerSession();

  // 2. Cleanly redirect if unauthenticated
  if (!session) {
    redirect('/admin/login'); 
  }

  // 3. Fetch Aircrafts and Aircraft Types in parallel!
  const [aircraftResult, aircraftTypes] = await Promise.all([
    // Fetch paginated aircraft
    aircraftService.findAllPaginated(session as any, { limit: 100 }),
    // Fetch the types for the dropdowns
    aircraftTypeService.findAll(session as any)
  ]);

  // 4. Pass fully typed data to Client Component
  return (
    <AircraftManagement 
      initialAircrafts={aircraftResult.data as any} 
      aircraftTypes={aircraftTypes as any} 
    />
  );
}
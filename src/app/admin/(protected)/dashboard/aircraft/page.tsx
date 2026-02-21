import { AircraftManagement } from '@/components/AircraftManagement';
import { aircraftService } from '@/services/aircraft.services'; // Use the newly created service
import { auth } from '@/lib/auth';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

export default async function AircraftPage() {
  // 1. Get the session securely
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    redirect('/admin/login'); // Or wherever your login is
  }

  // 2. Fetch data
  // Using findAllPaginated to handle the limit, passing the session
  const aircraftResult = await aircraftService.findAllPaginated(
    sessionResponse.user as any, 
    { limit: 100 } 
  );

  // NOTE: Your new aircraftService does not have a getAircraftTypes method.
  // Assuming you have an aircraftTypeService or repository for this:
  // const aircraftTypes = await aircraftTypeService.findAll(); 
  const aircraftTypes: any[] = []; // Placeholder until you implement the type service

  // 3. Pass data to Client Component
  return (
    <AircraftManagement 
      initialAircrafts={aircraftResult.data} 
      aircraftTypes={aircraftTypes} 
    />
  );
}
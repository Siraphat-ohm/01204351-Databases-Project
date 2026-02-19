import { AircraftManagement } from '@/components/AircraftManagement';
import { AircraftService } from '@/lib/services/backoffice/aircraft'; // Adjust path if needed

export default async function AircraftPage() {
  // 1. Fetch data in parallel
  // We fetch a larger limit to see the fleet, or you could implement pagination url params here
  const [aircraftResult, aircraftTypes] = await Promise.all([
    AircraftService.getAllAircraft({ limit: 100 }), 
    AircraftService.getAircraftTypes()
  ]);

  // 2. Pass data to Client Component
  // The service returns the exact shape we need (relations included)
  return (
    <AircraftManagement 
      initialAircrafts={aircraftResult.data} 
      aircraftTypes={aircraftTypes} 
    />
  );
}
import { FlightCreateForm } from "@/components/FlightCreateForm";
import { requireServerSession } from "@/services/auth.services"; // Adjust path to your new auth utility
import { aircraftService } from "@/services/aircraft.services";
import { routeService } from "@/services/route.services";

export default async function CreateFlightPage() {
  // 1. Enforce Authentication
  const session = await requireServerSession();

  // 2. Fetch Aircraft and Routes in parallel
  const [aircrafts, routes] = await Promise.all([
    aircraftService.findAll(session as any),
    routeService.findAll(session as any)
  ]);

  // 3. Format Aircraft Options
  const aircraftOptions = aircrafts.map((ac: any) => ({
    value: ac.id, // UUID
    label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'})`,
    disabled: ac.status !== 'ACTIVE'
  }));

  // 4. Format Route Data for easy client-side filtering
  const routeData = routes.map((route: any) => ({
    id: route.id, // UUID of the route
    originCode: route.origin.iataCode,
    originCity: route.origin.city,
    destCode: route.destination.iataCode,
    destCity: route.destination.city,
  }));

  return (
    <FlightCreateForm 
      aircraftOptions={aircraftOptions} 
      availableRoutes={routeData} 
    />
  );
}
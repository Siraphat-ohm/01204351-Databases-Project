import { FlightCreateForm } from "@/components/FlightCreateForm";
import { requireServerSession } from "@/services/auth.services"; 
import { aircraftService } from "@/services/aircraft.services";
import { routeService } from "@/services/route.services";
import { userService } from "@/services/user.services"; 

export default async function CreateFlightPage() {
  const session = await requireServerSession();

  const [aircrafts, routes, pilotsResponse] = await Promise.all([
    aircraftService.findAll(session as any),
    routeService.findAll(session as any),
    userService.findAllPaginated(session as any, {
      limit: 100, 
      where: { role: 'PILOT' }
    } as any)
  ]);

  const aircraftOptions = aircrafts.map((ac: any) => ({
    value: ac.id, 
    label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'})`,
    disabled: ac.status !== 'ACTIVE'
  }));

  const routeData = routes.map((route: any) => ({
    id: route.id, 
    originCode: route.origin.iataCode,
    originCity: route.origin.city,
    destCode: route.destination.iataCode,
    destCity: route.destination.city,
  }));

  // 🌟 NEW: Pass the image property along with value and label
  const captainOptions = pilotsResponse.data
    .filter((pilot: any) => pilot.staffProfile?.id) 
    .map((pilot: any) => ({
      value: pilot.staffProfile.id,
      label: `Capt. ${pilot.name || pilot.email.split('@')[0]} (${pilot.staffProfile.employeeId})`,
      image: pilot.image || null, // Extract the profile picture
    }));

  return (
    <FlightCreateForm 
      aircraftOptions={aircraftOptions} 
      availableRoutes={routeData} 
      captainOptions={captainOptions} 
    />
  );
}
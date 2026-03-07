import { FlightEditForm } from "@/components/FlightEditForm";
import { notFound } from "next/navigation";
import { flightService } from "@/services/flight.services";
import { aircraftService } from "@/services/aircraft.services"; 
import { routeService } from "@/services/route.services"; 
import { userService } from "@/services/user.services"; // 🌟 Import userService
import { requireServerSession } from "@/services/auth.services"; 

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) notFound();

  try {
    const session = await requireServerSession();

    // 🌟 Fetch Flight, Aircraft, Routes, AND Pilots in parallel
    const [flight, aircrafts, routes, pilotsResponse] = await Promise.all([
      flightService.findById(id, session as any),
      aircraftService.findAll(session as any),
      routeService.findAll(session as any),
      userService.findAllPaginated(session as any, {
        limit: 100, 
        where: { role: 'PILOT' }
      } as any)
    ]);

    // Process Aircraft Options
    const aircraftOptions = aircrafts.map((ac: any) => ({
      value: String(ac.id),
      label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'}) - ${ac.status}`,
      disabled: ac.status !== 'ACTIVE' && ac.id !== flight.aircraftId
    }));

    // Process Route Options
    const availableRoutes = routes.map((route: any) => ({
      id: route.id, 
      originCode: route.origin.iataCode,
      originCity: route.origin.city,
      destCode: route.destination.iataCode,
      destCity: route.destination.city,
    }));

    // 🌟 Format Captain Options (with Image)
    const captainOptions = pilotsResponse.data
      .filter((pilot: any) => pilot.staffProfile?.id) 
      .map((pilot: any) => ({
        value: pilot.staffProfile.id,
        label: `Capt. ${pilot.name || pilot.email.split('@')[0]} (${pilot.staffProfile.employeeId})`,
        image: pilot.image || null, 
      }));

    // Prepare Serializable Flight Object
    const serializableFlight = {
      id: flight.id,
      flightCode: flight.flightCode,
      status: flight.status,
      gate: flight.gate ?? null,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      basePriceEconomy: Number(flight.basePriceEconomy), 
      basePriceBusiness: Number(flight.basePriceBusiness),
      basePriceFirst: Number(flight.basePriceFirst),
      aircraftId: flight.aircraftId,
      captainId: flight.captainId, // 🌟 Make sure captainId is passed
      originCode: flight.route.origin.iataCode,
      destCode: flight.route.destination.iataCode,
    };
    
    return (
      <FlightEditForm 
        flight={serializableFlight as any} 
        aircraftOptions={aircraftOptions} 
        availableRoutes={availableRoutes}
        captainOptions={captainOptions} // 🌟 Pass Captain options
      />
    );
    
  } catch (error) {
    console.error("Error loading flight edit page:", error);
    notFound();
  }
}
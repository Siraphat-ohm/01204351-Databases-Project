import { FlightEditForm } from "@/components/FlightEditForm";
import { notFound } from "next/navigation";

import { flightService, FlightNotFoundError } from "@/services/flight.services";
import { aircraftService } from "@/services/aircraft.services"; 
import { routeService } from "@/services/route.services"; // Import Route Service
import { requireServerSession } from "@/services/auth.services"; // Clean auth utility

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) notFound();

  try {
    const session = await requireServerSession();

    // Fetch Flight, Aircraft, and Routes in parallel!
    const [flight, aircrafts, routes] = await Promise.all([
      flightService.findById(id, session as any),
      aircraftService.findAll(session as any),
      routeService.findAll(session as any)
    ]);

    // Process Aircraft Options
    const aircraftOptions = aircrafts.map((ac: any) => ({
      value: String(ac.id),
      label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'}) - ${ac.status}`,
      disabled: ac.status !== 'ACTIVE' && ac.id !== flight.aircraftId
    }));

    // Process Route Options for the cascading dropdowns
    const availableRoutes = routes.map((route: any) => ({
      id: route.id, 
      originCode: route.origin.iataCode,
      originCity: route.origin.city,
      destCode: route.destination.iataCode,
      destCity: route.destination.city,
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
      // Pass the IATA codes so the form dropdowns know what to pre-select
      originCode: flight.route.origin.iataCode,
      destCode: flight.route.destination.iataCode,
    };
    
    return (
      <FlightEditForm 
        flight={serializableFlight as any} 
        aircraftOptions={aircraftOptions} 
        availableRoutes={availableRoutes}
      />
    );
    
  } catch (error) {
    if (error instanceof FlightNotFoundError) {
      notFound();
    }
    throw error;
  }
}
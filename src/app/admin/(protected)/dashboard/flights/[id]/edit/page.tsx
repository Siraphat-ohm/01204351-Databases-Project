// app/dashboard/flights/[id]/edit/page.tsx

import { FlightEditForm } from "@/components/FlightEditForm";
import { notFound } from "next/navigation";

import { flightService, FlightNotFoundError } from "@/services/flight.services";
import { aircraftService } from "@/services/aircraft.services"; 
import { requireServerSession } from "@/services/auth.services"; // Use your clean auth utility

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  // 1. Unwrap params
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) notFound();

  try {
    // 2. Enforce Authentication
    const session = await requireServerSession();

    // 3. Fetch Flight AND All Aircrafts in parallel using the new services
    const [flight, aircrafts] = await Promise.all([
      // NOTE: Based on your FlightTable link, we are now passing the CUID (id), 
      // so we use findById instead of findByCode.
      flightService.findById(id, session as any),
      aircraftService.findAll(session as any)
    ]);

    // 4. Process Aircraft Options (Server Side Logic)
    const aircraftOptions = aircrafts.map((ac: any) => ({
      value: String(ac.id), // Now a string CUID
      // Format: "HS-TBA (Boeing 777) - ACTIVE"
      label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'}) - ${ac.status}`,
      // Disable if not active (unless it's the aircraft currently assigned to this flight!)
      disabled: ac.status !== 'ACTIVE' && ac.id !== flight.aircraftId
    }));

    // 5. Prepare Serializable Flight Object
    const serializableFlight = {
      id: flight.id,
      flightCode: flight.flightCode,
      status: flight.status,
      gate: flight.gate ?? null,
      departureTime: flight.departureTime,
      arrivalTime: flight.arrivalTime,
      
      // Pass all 3 new pricing fields (convert Decimal to Number if necessary)
      basePriceEconomy: Number(flight.basePriceEconomy), 
      basePriceBusiness: Number(flight.basePriceBusiness),
      basePriceFirst: Number(flight.basePriceFirst),
      
      // Pass these IDs so the form can initialize its Select states
      aircraftId: flight.aircraftId,
      routeId: flight.routeId,
      captainId: flight.captainId ?? null,

      aircraft: {
        id: flight.aircraft.id,
        tailNumber: flight.aircraft.tailNumber,
        type: { model: flight.aircraft.type?.model || 'Unknown' }
      },
      route: {
        origin: { city: flight.route.origin.city, iataCode: flight.route.origin.iataCode },
        destination: { city: flight.route.destination.city, iataCode: flight.route.destination.iataCode }
      }
    };
    
    // 6. Pass both flight AND options to the form
    return (
      <FlightEditForm 
        flight={serializableFlight as any} 
        aircraftOptions={aircraftOptions} 
      />
    );
    
  } catch (error) {
    // 7. Gracefully catch the custom error if the flight ID doesn't exist
    if (error instanceof FlightNotFoundError) {
      notFound();
    }
    // Re-throw other errors (like AuthenticationRequiredError) for standard Next.js handling
    throw error;
  }
}
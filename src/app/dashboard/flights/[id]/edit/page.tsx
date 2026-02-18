import { FlightService } from "@/lib/services/backoffice/flight";
import { AircraftService } from "@/lib/services/backoffice/aircraft"; 
import { FlightEditForm } from "@/components/FlightEditForm";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditFlightPage({ params }: PageProps) {
  // 1. Unwrap params
  const resolvedParams = await params;
  const id = resolvedParams.id;

  if (!id) notFound();

  // 2. Fetch Flight AND All Aircrafts in parallel
  const [flight, aircraftResult] = await Promise.all([
    FlightService.getFlightByFlightCode(id),
    AircraftService.getAllAircraft({ limit: 1000 }) // Fetch all to show everything
  ]);

  if (!flight) {
    notFound();
  }

  // 3. Process Aircraft Options (Server Side Logic)
  // We do the sorting and grouping here so the client receives ready-to-use data
  const aircraftOptions = aircraftResult.data.map((ac) => ({
    value: ac.id.toString(),
    // Format: "HS-TBA (Boeing 777) - ACTIVE"
    label: `${ac.tailNumber} (${ac.type.model}) - ${ac.status}`,
    // Disable if not active (unless it's the aircraft currently assigned to this flight!)
    disabled: ac.status !== 'ACTIVE' && ac.id !== flight.aircraftId
  }));

  // 4. Prepare Serializable Flight Object
  const serializableFlight = {
    id: flight.id,
    flightCode: flight.flightCode,
    status: flight.status,
    gate: flight.gate,
    departureTime: flight.departureTime,
    arrivalTime: flight.arrivalTime,
    basePrice: flight.basePrice.toNumber(), // Convert Decimal
    aircraft: {
      id: flight.aircraft.id,
      tailNumber: flight.aircraft.tailNumber,
      type: { model: flight.aircraft.type.model }
    },
    route: {
      origin: { city: flight.route.origin.city, iataCode: flight.route.origin.iataCode },
      destination: { city: flight.route.destination.city, iataCode: flight.route.destination.iataCode }
    }
  };

  // 5. Pass both flight AND options to the form
  return (
    <FlightEditForm 
      flight={serializableFlight} 
      aircraftOptions={aircraftOptions} 
    />
  );
}
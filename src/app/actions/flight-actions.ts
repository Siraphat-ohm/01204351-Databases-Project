'use server'

import { FlightService } from "@/lib/services/flight.service";
import { CreateFlightInput } from "@/types/flight";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { UpdateFlightInput } from "@/types/flight";


const MOCK_AIRCRAFT_FLEET = [
  { value: '1', label: 'HS-TBA (Boeing 777-300ER)' },
  { value: '2', label: 'HS-TBB (Boeing 777-300ER)' },
  { value: '3', label: 'HS-XEA (Airbus A350-900)' },
  { value: '4', label: 'HS-BBX (Airbus A320)' },
  { value: '5', label: 'HS-BBY (Airbus A320)' },
  { value: '6', label: 'HS-PGA (ATR 72-600)' },
];


export async function createFlightAction(formData: CreateFlightInput) {
  try {
    // 1. Call the service
    await FlightService.createFlight(formData);
    
    // 2. Revalidate cache to show new data on the list page
    revalidatePath('/dashboard/flights');
    
  } catch (error: any) {
    // Return error message to client
    return { error: error.message };
  }

  // 3. Redirect back to list (must be outside try/catch)
  redirect('/dashboard/flights');
}

export async function updateFlightAction(id: number, formData: any) {
  
  // Prepare the payload based on UpdateFlightInput interface
  const payload: UpdateFlightInput = {
    flightCode: formData.flightCode,
    // Ensure IDs are numbers if present
    routeId: formData.routeId ? Number(formData.routeId) : undefined,
    aircraftId: formData.aircraftId ? Number(formData.aircraftId) : undefined,
    // Handle Captain ID (null vs undefined vs number)
    captainId: formData.captainId ? Number(formData.captainId) : null, 
    gate: formData.gate || null,
    status: formData.status,
    // Convert strings to Dates
    departureTime: formData.departureTime ? new Date(formData.departureTime) : undefined,
    arrivalTime: formData.arrivalTime ? new Date(formData.arrivalTime) : undefined,
    // Handle Decimal/Number conversion
    basePrice: formData.basePrice ? Number(formData.basePrice) : undefined,
  };

  try {
    await FlightService.updateFlight(id, payload);
    revalidatePath('/dashboard/flights');
  } catch (error: any) {
    return { error: error.message };
  }

  redirect('/dashboard/flights');
}

export async function getAircraftOptions() {
  // Simulate Network Latency
  await new Promise((resolve) => setTimeout(resolve, 500));
  return MOCK_AIRCRAFT_FLEET;
}
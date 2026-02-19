"use server"
import { FlightService } from "@/lib/services/backoffice/flight";
import { AircraftService } from "@/lib/services/backoffice/aircraft"; 
import { CreateFlightInput, UpdateFlightInput } from "@/types/flight";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// --- 1. Dynamic Aircraft Options Helper ---
export async function getAircraftOptions() {
  // 1. Fetch ALL aircraft (Limit 1000 to ensure we get the full fleet)
  const { data } = await AircraftService.getAllAircraft();
  // 2. Process data for Mantine Select (Grouping + Disabling)
  // We sort them so "Active" groups appear first
  const options =  await data.map((ac) => ({
    value: ac.id.toString(),
    // Label format: "HS-TBA (Boeing 777) - ACTIVE"
    label: `${ac.tailNumber} (${ac.type.model}) - ${ac.status}`,
    // Make unselectable if not active
    disabled: ac.status !== 'ACTIVE'
  }));
  return options;
}

// --- 2. Create Flight Action (Unchanged) ---
export async function createFlightAction(formData: CreateFlightInput) {
  try {
    await FlightService.createFlight(formData);
    revalidatePath('/dashboard/flights');
  } catch (error: any) {
    return { error: error.message };
  }
  redirect('/dashboard/flights');
}

// --- 3. Update Flight Action (Unchanged) ---
export async function updateFlightAction(id: number, formData: any) {
  const payload: UpdateFlightInput = {
    id: id,
    flightCode: formData.flightCode,
    routeId: formData.routeId ? Number(formData.routeId) : undefined,
    aircraftId: formData.aircraftId ? Number(formData.aircraftId) : undefined,
    captainId: formData.captainId ? Number(formData.captainId) : null,
    gate: formData.gate || null,
    status: formData.status,
    departureTime: formData.departureTime ? new Date(formData.departureTime) : undefined,
    arrivalTime: formData.arrivalTime ? new Date(formData.arrivalTime) : undefined,
    basePrice: formData.basePrice ? Number(formData.basePrice) : undefined,
  };

  try {
    await FlightService.updateFlight(payload);
    revalidatePath('/dashboard/flights');
  } catch (error: any) {
    return { error: error.message };
  }
  redirect('/dashboard/flights');
}

export async function deleteFlightAction(id: number) {
  try {
    await FlightService.deleteFlight(id);
    revalidatePath('/dashboard/flights');
    return { success: true };
  } catch (error: any) {
    // Return error message to client (e.g., if there are booking constraints)
    return { error: error.message };
  }
}
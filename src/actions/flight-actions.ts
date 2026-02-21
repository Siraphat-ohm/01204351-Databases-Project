'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { flightService } from "@/services/flight.services"; // Adjust path if needed
import { aircraftService } from "@/services/aircraft.services"; // Adjust path if needed
import { createFlightSchema, updateFlightSchema } from "@/types/flight.type";
import { auth } from "@/lib/auth";

// --- 1. Dynamic Aircraft Options Helper ---
export async function getAircraftOptions() {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return []; // Return empty options if unauthorized
  }

  try {
    // 1. Fetch ALL aircraft using the new service (requires session)
    const data = await aircraftService.findAll(sessionResponse.user as any);
    
    // 2. Process data for Mantine Select (Grouping + Disabling)
    const options = data.map((ac: any) => ({
      value: ac.id, // Now a string (cuid) instead of toString()
      // Label format: "HS-TBA (Boeing 777) - ACTIVE"
      label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'}) - ${ac.status}`,
      // Make unselectable if not active
      disabled: ac.status !== 'ACTIVE'
    }));

    return options;
  } catch (error) {
    console.error("Failed to fetch aircraft options:", error);
    return [];
  }
}

// --- 2. Create Flight Action ---
export async function createFlightAction(formData: unknown) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return { error: "Unauthorized: Please log in." };
  }

  // Validate the incoming payload with Zod
  const validation = createFlightSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    await flightService.createFlight(validation.data, sessionResponse.user as any);
  } catch (error: any) {
    return { error: error.message }; // Catches FlightConflictError, etc.
  }
  
  revalidatePath('/dashboard/flights');
  redirect('/dashboard/flights');
}

// --- 3. Update Flight Action ---
export async function updateFlightAction(id: string, formData: unknown) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return { error: "Unauthorized: Please log in." };
  }

  // Validate the incoming payload with Zod
  const validation = updateFlightSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    await flightService.updateFlight(id, validation.data, sessionResponse.user as any);
  } catch (error: any) {
    return { error: error.message };
  }
  
  revalidatePath('/dashboard/flights');
  redirect('/dashboard/flights');
}

// --- 4. Delete Flight Action ---
export async function deleteFlightAction(id: string) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return { error: "Unauthorized: Please log in." };
  }

  try {
    await flightService.deleteFlight(id, sessionResponse.user as any);
    revalidatePath('/dashboard/flights');
    return { success: true };
  } catch (error: any) {
    // Catches FlightInUseError, UnauthorizedError, etc.
    return { error: error.message };
  }
}
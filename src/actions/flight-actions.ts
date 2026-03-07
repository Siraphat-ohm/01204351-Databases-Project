'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { flightService } from "@/services/flight.services"; 
import { aircraftService } from "@/services/aircraft.services"; 
import { createFlightSchema, updateFlightSchema } from "@/types/flight.type";

// Import your new auth utility
import { requireServerSession, getServerSession } from "@/services/auth.services"; 

// --- 1. Dynamic Aircraft Options Helper ---
export async function getAircraftOptions() {
  try {
    // Use getServerSession here instead of requireServerSession so we can fail 
    // silently and return an empty array if the user isn't logged in, rather than throwing.
    const session = await getServerSession();

    if (!session) {
      return []; 
    }

    // Fetch ALL aircraft using the new service
    const data = await aircraftService.findAll(session as any);
    
    // Process data for Mantine Select (Grouping + Disabling)
    const options = data.map((ac: any) => ({
      value: ac.id, 
      label: `${ac.tailNumber} (${ac.type?.model || 'Unknown'}) - ${ac.status}`,
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
  // 1. Validate the incoming payload with Zod (Fail fast)
  const validation = createFlightSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    // 2. Require session (throws AuthenticationRequiredError if not logged in)
    const session = await requireServerSession();

    // 3. Pass data to the service
    await flightService.createFlight(validation.data, session as any);
  } catch (error: any) {
    return { error: error.message }; 
  }
  
  // 4. Redirect outside the try/catch (important for Next.js!)
  revalidatePath('/admin/dashboard/flights');
  redirect('/admin/dashboard/flights');
}

// --- 3. Update Flight Action ---
export async function updateFlightAction(id: string, formData: unknown) {
  // 1. Validate the incoming payload with Zod
  const validation = updateFlightSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    // 2. Require session
    const session = await requireServerSession();

    // 3. Update via service
    await flightService.updateFlight(id, validation.data, session as any);
  } catch (error: any) {
    return { error: error.message };
  }
  
  // 4. Redirect outside the try/catch
  revalidatePath('/admin/dashboard/flights');
  redirect('/admin/dashboard/flights');
}

// --- 5. Search Flights Action (Paginated) ---
export async function searchFlightsAction(search: string = '', page: number = 1, limit: number = 20) {
  try {
    const session = await getServerSession();
    if (!session) return { data: [], total: 0 };

    const response = await flightService.findAllPaginated(session as any, {
      page,
      limit,
      where: {
        departureTime: { gte: new Date() },
        OR: [
          { flightCode: { contains: search, mode: 'insensitive' } },
        ]
      }
    } as any);

    return {
      data: response.data.map((f: any) => ({
        id: f.id,
        flightCode: f.flightCode,
        route: `${f.route.origin.iataCode} - ${f.route.destination.iataCode}`,
        departureTime: f.departureTime
      })),
      total: response.meta.total
    };
  } catch (error) {
    console.error("Failed to search flights:", error);
    return { data: [], total: 0 };
  }
}

// --- 4. Delete Flight Action ---
export async function deleteFlightAction(id: string) {
  try {
    // 1. Require session
    const session = await requireServerSession();

    // 2. Delete via service
    await flightService.deleteFlight(id, session as any);
    
    revalidatePath('/admin/dashboard/flights');
    return { success: true };
  } catch (error: any) {
    // Catches FlightInUseError, UnauthorizedError, AuthenticationRequiredError
    return { error: error.message };
  }
}
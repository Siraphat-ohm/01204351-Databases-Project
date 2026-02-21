'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { aircraftService } from "@/services/aircraft.services";
import { updateAircraftSchema } from "@/types/aircraft.type";
import { auth } from "@/lib/auth"; 

// Using 'unknown' instead of 'any' forces us to validate the data
export async function updateAircraftAction(id: string, formData: unknown) {
  // 1. Validate the user session securely on the server
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return { error: "Unauthorized: Please log in." };
  }

  // 2. Validate the incoming payload with Zod
  const validation = updateAircraftSchema.safeParse(formData);

  if (!validation.success) {
    // Return specific field errors so your Mantine form can highlight them
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    // 3. Pass the validated, strictly-typed data to your service
    // Ensure the third argument matches your custom ServiceSession type
    await aircraftService.updateAircraft(
      id, 
      validation.data, 
      sessionResponse.user as any 
    );
  } catch (error: any) {
    // Catch service-level errors (e.g., AircraftNotFoundError, AircraftConflictError)
    return { error: error.message };
  }
  
  // 4. Revalidate and redirect on success
  revalidatePath('/dashboard/aircraft');
  redirect('/dashboard/aircraft');
}

export async function deleteAircraftAction(id: string) {
  const sessionResponse = await auth.api.getSession({
    headers: await headers(),
  });

  if (!sessionResponse) {
    return { error: "Unauthorized: Please log in." };
  }

  try {
    await aircraftService.deleteAircraft(id, sessionResponse.user as any);
    revalidatePath('/dashboard/aircraft');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
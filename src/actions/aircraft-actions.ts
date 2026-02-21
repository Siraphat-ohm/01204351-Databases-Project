'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { aircraftService } from "@/services/aircraft.services";
import { updateAircraftSchema } from "@/types/aircraft.type";
// Note: Adjust this import path to point to your new auth utility file
import { requireServerSession } from "@/services/auth.services"; 

export async function updateAircraftAction(id: string, formData: unknown) {
  // 1. Validate the incoming payload with Zod (Fail fast before checking DB/Auth)
  const validation = updateAircraftSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    // 2. Validate the user session using your new auth wrapper.
    // If unauthorized, this throws AuthenticationRequiredError which is caught below.
    const session = await requireServerSession();

    // 3. Pass the validated, strictly-typed data and user to your service
    await aircraftService.updateAircraft(
      id, 
      validation.data, 
      session as any // Keep as any until your ServiceSession type matches perfectly
    );
  } catch (error: any) {
    // Catches AuthenticationRequiredError, AircraftNotFoundError, AircraftConflictError, etc.
    return { error: error.message };
  }
  
  // 4. Revalidate and redirect on success
  // (Always keep redirect() outside of try/catch blocks in Next.js!)
  revalidatePath('/admin/dashboard/aircraft');
  redirect('/admin/dashboard/aircraft');
}

export async function deleteAircraftAction(id: string) {
  try {
    // 1. Require session (throws if not logged in)
    const session = await requireServerSession();

    // 2. Attempt deletion
    await aircraftService.deleteAircraft(id, session as any);
    
    // 3. Revalidate cache
    revalidatePath('/admin/dashboard/aircraft');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
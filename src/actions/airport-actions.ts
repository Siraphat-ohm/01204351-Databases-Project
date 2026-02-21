'use server'

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { airportService } from "@/services/airport.services"; 
import { createAirportSchema } from "@/types/airport.type";
import { requireServerSession } from "@/services/auth.services"; // Adjust path to your new auth utility

export async function createAirportAction(formData: unknown) {
  // 1. Validate incoming data
  const validation = createAirportSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    // 2. Enforce Authentication & Authorization
    const session = await requireServerSession();

    // 3. Create the airport
    await airportService.createAirport(validation.data, session as any);
  } catch (error: any) {
    // Catches AirportConflictError if IATA code already exists
    return { error: error.message }; 
  }
  
  // 4. Redirect on success
  revalidatePath('/admin/dashboard/airports');
  redirect('/admin/dashboard/airports');
}

// (You can also move your delete action here from the previous step)
export async function deleteAirportAction(id: string) {
  try {
    const session = await requireServerSession();
    await airportService.deleteAirport(id, session.user as any);
    revalidatePath('/admin/dashboard/airports');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
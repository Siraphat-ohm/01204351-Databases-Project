'use server'

import { revalidatePath } from "next/cache";
import { routeService } from "@/services/route.services"; // Adjust path if needed
import { createRouteSchema } from "@/types/route.type";
import { requireServerSession } from "@/services/auth.services"; // Adjust path to your new auth utility

export async function createRouteAction(formData: unknown) {
  const validation = createRouteSchema.safeParse(formData);

  if (!validation.success) {
    return { 
      error: "Validation failed", 
      fieldErrors: validation.error.flatten().fieldErrors 
    };
  }

  try {
    const session = await requireServerSession();
    await routeService.createRoute(validation.data, session as any);
  } catch (error: any) {
    // Catches RouteConflictError if route already exists
    return { error: error.message }; 
  }
  
  revalidatePath('/admin/dashboard/routes');
  return { success: true };
}

export async function deleteRouteAction(id: string) {
  try {
    const session = await requireServerSession();
    await routeService.deleteRoute(id, session as any);
    
    revalidatePath('/admin/dashboard/routes');
    return { success: true };
  } catch (error: any) {
    // Catches RouteHasActiveFlightsError
    return { error: error.message };
  }
}
'use server'

import { AircraftService } from "@/lib/services/backoffice/aircraft";
import { UpdateAircraftInput } from "@/types/aircraft";
import { AircraftStatus } from "@/generated/prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function updateAircraftAction(id: number, formData: any) {
  const payload: UpdateAircraftInput = {
    id,
    tailNumber: formData.tailNumber,
    aircraftTypeId: Number(formData.aircraftTypeId),
    status: formData.status as AircraftStatus,
  };

  try {
    await AircraftService.updateAircraft(payload);
    revalidatePath('/dashboard/aircraft');
  } catch (error: any) {
    return { error: error.message };
  }
  
  redirect('/dashboard/aircraft');
}

export async function deleteAircraftAction(id: number) {
  try {
    await AircraftService.deleteAircraft(id);
    revalidatePath('/dashboard/aircraft');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
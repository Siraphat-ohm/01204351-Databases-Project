'use server'

import { aircraftTypeService } from '@/services/aircraft-type.services'; 
import { getServerSession, requireServerSession } from '@/services/auth.services'; 
import { revalidatePath } from 'next/cache';
import { CreateAircraftTypeInput } from '@/types/aircraft-type.type';

export async function createAircraftTypeAction(data: CreateAircraftTypeInput) {
  const session = await requireServerSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await aircraftTypeService.createAircraftType(data, session as any);
    
    // Adjust this path based on where you plan to list aircraft types
    revalidatePath('/admin/dashboard/aircraft/types'); 
    return { success: true };
  } catch (error: any) {
    return { error: error.message || 'Failed to add aircraft type.' };
  }
}
'use server'

import { flightOpsLogService } from '@/services/flight-ops-log.services'; // Adjust path
import { getServerSession } from '@/services/auth.services'; // Adjusted to your import
import { revalidatePath } from 'next/cache';
import { PatchFlightOpsLogInput } from '@/types/flight-ops-log.type';

export async function patchFlightOpsLogAction(id: string, input: PatchFlightOpsLogInput) {
  const session = await getServerSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await flightOpsLogService.patchById(id, input, session);
    revalidatePath('/dashboard/ops-logs');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
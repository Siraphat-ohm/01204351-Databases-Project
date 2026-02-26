'use server'

import { paymentLogService } from '@/services/payment-log.services'; // Adjust path
import { revalidatePath } from 'next/cache';
import { UpdatePaymentLogInput } from '@/types/payment-log.type'; // Adjust path
import { getServerSession } from '@/services/auth.services';

export async function updatePaymentLogAction(id: string, input: UpdatePaymentLogInput) {
  const session = await getServerSession();
  
  if (!session) {
    return { error: 'Unauthorized' };
  }

  try {
    await paymentLogService.updateById(id, input, session);
    revalidatePath('/dashboard/payment-logs');
    return { success: true };
  } catch (error: any) {
    return { error: error.message };
  }
}
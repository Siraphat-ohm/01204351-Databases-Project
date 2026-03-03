'use server'

import { revalidatePath } from "next/cache";
import { paymentLogService } from "@/services/payment-log.services";
import { updatePaymentLogSchema } from "@/types/payment-log.type";
import { getServerSession } from "@/services/auth.services";

export async function updatePaymentLogAction(id: string, payload: { status: string }) {
  try {
    const session = await getServerSession();
    if (!session || session.user.role !== 'ADMIN') {
      return { error: "Unauthorized. Admin access required." };
    }

    // 1. Safely parse the incoming payload
    const validation = updatePaymentLogSchema.safeParse(payload);

    if (!validation.success) {
      return { error: "Invalid status provided." };
    }

    // 2. Perform the update
    await paymentLogService.updateById(id, validation.data, session as any);

    // 3. Revalidate the dashboard so the tables refresh in the background
    revalidatePath('/admin/dashboard/payment-logs');
    
    return { success: true };
    
  } catch (error: any) {
    return { error: error.message || "Failed to update transaction status." };
  }
}
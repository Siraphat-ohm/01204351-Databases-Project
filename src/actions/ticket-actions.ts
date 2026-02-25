'use server'

import { revalidatePath } from 'next/cache';

export async function mockUpdateTicketAction(ticketId: string, payload: any) {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 800));

  console.log(`Mock updated ticket ${ticketId} with payload:`, payload);

  // In the future: await ticketService.updateTicket(ticketId, payload, session);
  
  revalidatePath(`/dashboard/flight/[id]/tickets`, 'page');
  return { success: true };
}
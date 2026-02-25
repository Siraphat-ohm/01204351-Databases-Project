"use server";

import { bookingService } from '@/services/booking.services';
import { useAuthSession,  } from "@/services/auth-client.service";
import { redirect } from "next/navigation";

export async function createBookingAction(flightId: string, passengers: any[]) {
  // 1. Get the session (matches ServiceSession shape: id, role)
 const { data: session } = useAuthSession();
  
  if (!session) throw new Error("Authentication required");

  // 2. Call the service directly
  // Note: createBooking expects (input, session) based on the code you sent
  const result = await bookingService.createBooking({
    flightId,
    userId: session.user.id,
    passengers,
    // total price calculation logic here or passed from front
  }, session);

  // 3. Return the ID for the redirect
  return { bookingId: result.id };
}
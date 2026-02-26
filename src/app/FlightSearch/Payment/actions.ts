"use server";

import { bookingService } from '@/services/booking.services';
import { paymentService } from '@/services/payment.services';
// Update this import to match where your auth session helper is located based on Section 4.0
import { useAuthSession, signOutCurrentUser } from "@/services/auth-client.service";
export async function getBookingSummaryAction(bookingId: string) {
    const { data: session } = useAuthSession();

  if (!session) throw new Error("Authentication required");

  // Uses bookingService.findById to securely fetch the booking details
  const booking = await bookingService.findById(bookingId, session as any);
  
  return { 
    id: booking.id, 
    bookingRef: booking.bookingRef, 
    totalPrice: booking.totalPrice 
  };
}

export async function processPaymentAction(bookingId: string, method: string, amount: number) {
   const { data: session } = useAuthSession();

  if (!session) throw new Error("Authentication required");

  try {
    // 1. Create the payment record
    const payment = await paymentService.createPayment({
      bookingId,
      amount,
      currency: "THB",
      method
    }, session as any);

    // 2. Mark the payment as successful. 
    // markPaymentSuccess expects the Payment ID (not booking ID)
    await paymentService.markPaymentSuccess(payment.id, {
      paidAt: new Date().toISOString(),
      transactionId: `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
    }, session as any);

    return { success: true };
  } catch (error: any) {
    console.error("Payment processing error:", error);
    throw new Error(error.message || "Payment failed to process");
  }
}
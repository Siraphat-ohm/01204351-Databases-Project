"use server";

import { bookingService } from '@/services/booking.services';
import { paymentService } from '@/services/payment.services';
import { getServerSession } from '@/services/auth.services';
import { headers } from 'next/headers';

export async function getBookingSummaryAction(bookingId: string) {
  const session = await getServerSession();
  if (!session) throw new Error('Authentication required');

  const booking = await bookingService.findById(bookingId, session as any);

  return {
    id: booking.id,
    bookingRef: booking.bookingRef,
    totalPrice: booking.totalPrice,
  };
}

/**
 * Creates a Stripe Checkout session for one or more bookings and returns
 * the redirect URL. The caller should redirect the user to `result.url`.
 */
export async function processPaymentAction(bookingId: string | string[]) {
  const session = await getServerSession();
  if (!session) throw new Error('Authentication required');

  const headersList = await headers();
  const origin = headersList.get('origin') ?? 'http://localhost:3000';

  const result = await paymentService.createCheckoutSession(
    bookingId,
    origin,
    session as any,
  );

  // Returns { url: string } — redirect the user to result.url
  return result;
}
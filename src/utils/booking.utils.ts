import type { BookingTicketInput } from '@/types/booking.type';

export function calculateBookingTotalFromTickets(tickets: BookingTicketInput[]) {
  return tickets.reduce((sum, ticket) => sum + ticket.price + (ticket.seatSurcharge ?? 0), 0);
}

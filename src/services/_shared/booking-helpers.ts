import { BookingStatus, FlightStatus } from '@/generated/prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '@/lib/errors';
import { bookingRepository } from '@/repositories/booking.repository';
import { flightRepository } from '@/repositories/flight.repository';
import type { BookingTicketInput } from '@/types/booking.type';
import { calculateBookingTotalFromTickets } from '@/utils/booking.utils';

const MAX_PASSENGERS_PER_BOOKING = 9;

function makeBookingRef() {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `BK${random}`;
}

function assertNoDuplicateSeatAssignments(tickets: BookingTicketInput[]) {
  const seen = new Set<string>();
  for (const t of tickets) {
    if (!t.seatNumber) continue;
    const seat = t.seatNumber.trim().toUpperCase();
    if (seen.has(seat)) {
      throw new ConflictError(`Duplicate seat in request: ${seat}`);
    }
    seen.add(seat);
  }
}

function getRequestedSeats(tickets: BookingTicketInput[]) {
  return tickets
    .map((t) => t.seatNumber?.trim().toUpperCase())
    .filter((s): s is string => Boolean(s));
}

export function canForceChangeFromStatus(status: FlightStatus) {
  const disruptedStatuses: FlightStatus[] = [
    FlightStatus.CANCELLED,
    FlightStatus.DELAYED,
    FlightStatus.DIVERTED,
  ];

  return disruptedStatuses.includes(status);
}

export async function generateUniqueBookingRef() {
  for (let i = 0; i < 5; i++) {
    const bookingRef = makeBookingRef();
    const exists = await bookingRepository.findByBookingRef(bookingRef);
    if (!exists) return bookingRef;
  }
  throw new ConflictError('Could not generate unique booking reference');
}

export function makeGuestEmail(contactEmail: string) {
  const [local = 'guest', domain = 'example.com'] = contactEmail.toLowerCase().split('@');
  const token = Math.random().toString(36).slice(2, 10);
  return `${local}+guest-${token}@${domain}`;
}

export function assertPassengerLimit(tickets: BookingTicketInput[]) {
  if (tickets.length > MAX_PASSENGERS_PER_BOOKING) {
    throw new BadRequestError(`Too many passengers in one booking. Maximum allowed: ${MAX_PASSENGERS_PER_BOOKING}`);
  }
}

export function assertBookingTotalMatchesTickets(totalPrice: number, tickets: BookingTicketInput[]) {
  const expected = calculateBookingTotalFromTickets(tickets);
  if (Math.abs(expected - totalPrice) > 0.01) {
    throw new BadRequestError(`Total price mismatch. Expected ${expected}, got ${totalPrice}`);
  }
}

export async function assertFlightExists(flightId: string) {
  const flight = await flightRepository.findById(flightId);
  if (!flight) throw new NotFoundError(`Booking not found: flight:${flightId}`);
}

export async function resolveBookingRef(requestedBookingRef?: string) {
  const bookingRef = requestedBookingRef ?? (await generateUniqueBookingRef());
  const existingByRef = await bookingRepository.findByBookingRef(bookingRef);
  if (existingByRef) throw new ConflictError('Booking reference already exists');
  return bookingRef;
}

export async function assertSeatAssignmentsAvailable(flightId: string, tickets: BookingTicketInput[]) {
  assertNoDuplicateSeatAssignments(tickets);

  const requestedSeats = getRequestedSeats(tickets);
  if (requestedSeats.length === 0) return;

  const occupied = await bookingRepository.findOccupiedSeats(flightId, requestedSeats);
  if (occupied.length === 0) return;

  const occupiedSeatList = occupied
    .map((s) => s.seatNumber)
    .filter((s): s is string => Boolean(s))
    .sort();

  throw new ConflictError(`Seat already assigned: ${occupiedSeatList.join(', ')}`);
}

export function isBookingCancelled(status: BookingStatus) {
  return status === BookingStatus.CANCELLED;
}

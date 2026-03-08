import { BadRequestError, NotFoundError, ConflictError, UnauthorizedError } from '@/lib/errors';
import { bookingRepository } from '@/repositories/booking.repository';
import { flightRepository } from '@/repositories/flight.repository';
import { userRepository } from '@/repositories/user.repository';
import { paymentService } from '@/services/payment.services';
import { calculateBookingTotalFromTickets } from '@/utils/booking.utils';
import {
  acceptReaccommodationSchema,
  cancelReaccommodationSchema,
  createBookingSchema,
  createBookingWithTicketsSchema,
  createGuestBookingSchema,
  createGuestBookingWithTicketsSchema,
  changeFlightSchema,
  type AcceptReaccommodationInput,
  bookingAdminInclude,
  type BookingAdmin,
  type BookingListItem,
  type BookingServiceAction,
  type BookingTicketInput,
  type CancelReaccommodationInput,
  type CreateBookingInput,
  type CreateGuestBookingInput,
  type CreateGuestBookingWithTicketsInput,
  type CreateBookingWithTicketsInput,
  type ChangeFlightInput,
} from '@/types/booking.type';
import type { PaginatedResponse } from '@/types/common';
import { canAccessBooking } from '@/auth/permissions';
import { BookingStatus, FlightStatus, type Prisma } from '@/generated/prisma/client';
import type { ServiceSession as Session } from '@/services/_shared/session';
import { makePermissionHelpers } from '@/services/_shared/authorization';
import {
  resolvePagination,
  type PaginationParams,
} from '@/services/_shared/pagination';
const {
  checkPermission,
  hasPermission: hasBookingPermission,
} = makePermissionHelpers<BookingServiceAction>(canAccessBooking, 'booking', (a) => new UnauthorizedError(a));

const MAX_PASSENGERS_PER_BOOKING = 9;

function makeBookingRef(): string {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `BK${random}`;
}

function makeGuestEmail(contactEmail: string): string {
  const [local = 'guest', domain = 'example.com'] = contactEmail.toLowerCase().split('@');
  const token = Math.random().toString(36).slice(2, 10);
  return `${local}+guest-${token}@${domain}`;
}

function canForceChangeFromStatus(status: FlightStatus): boolean {
  const disruptedStatuses: FlightStatus[] = [
    FlightStatus.CANCELLED,
    FlightStatus.DELAYED,
    FlightStatus.DIVERTED,
  ];
  return disruptedStatuses.includes(status);
}

async function generateUniqueBookingRef(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const bookingRef = makeBookingRef();
    try {
      await bookingRepository.findByBookingRef(bookingRef);
      // ref exists, try again
    } catch {
      return bookingRef;
    }
  }
  throw new ConflictError('Could not generate unique booking reference');
}

async function resolveBookingRef(requestedBookingRef?: string): Promise<string> {
  const bookingRef = requestedBookingRef ?? (await generateUniqueBookingRef());
  try {
    await bookingRepository.findByBookingRef(bookingRef);
    throw new ConflictError('Booking reference already exists');
  } catch (e) {
    if (e instanceof ConflictError) throw e;
    return bookingRef;
  }
}

async function createGuestUserForBooking(
  contactEmail: string,
  guestName: string | null | undefined,
  contactPhone: string | null | undefined,
) {
  return userRepository.createGuestUser({
    email: makeGuestEmail(contactEmail),
    name: guestName ?? 'Guest Passenger',
    phone: contactPhone ?? undefined,
  });
}

function assertPassengerLimit(tickets: BookingTicketInput[]): void {
  if (tickets.length > MAX_PASSENGERS_PER_BOOKING) {
    throw new BadRequestError(`Too many passengers in one booking. Maximum allowed: ${MAX_PASSENGERS_PER_BOOKING}`);
  }
}

function assertBookingTotalMatchesTickets(totalPrice: number, tickets: BookingTicketInput[]): void {
  const expected = calculateBookingTotalFromTickets(tickets);
  if (Math.abs(expected - totalPrice) > 0.01) {
    throw new BadRequestError(`Total price mismatch. Expected ${expected}, got ${totalPrice}`);
  }
}

async function assertFlightExists(flightId: string): Promise<void> {
  await flightRepository.findById(flightId);
}

function assertNoDuplicateSeatAssignments(tickets: BookingTicketInput[]): void {
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

function getRequestedSeats(tickets: BookingTicketInput[]): string[] {
  return tickets
    .map((t) => t.seatNumber?.trim().toUpperCase())
    .filter((s): s is string => Boolean(s));
}

async function assertSeatAssignmentsAvailable(
  flightId: string,
  tickets: BookingTicketInput[],
): Promise<void> {
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

async function getBookingByIdOrThrow(id: string, include?: Prisma.BookingInclude) {
  return bookingRepository.findById(id, include);
}

async function getBookingByBookingRefOrThrow(bookingRef: string, include?: Prisma.BookingInclude) {
  return bookingRepository.findByBookingRef(bookingRef, include);
}

function assertBookingNotCancelled(booking: { id: string; status: BookingStatus }): void {
  if (booking.status === BookingStatus.CANCELLED) {
    throw new ConflictError(`Booking already cancelled: ${booking.id}`);
  }
}

function assertBookingIsPendingReaccommodation(booking: { id: string; status: BookingStatus }): void {
  if (booking.status !== BookingStatus.REACCOMMODATION_PENDING) {
    throw new ConflictError(`Booking is not pending reaccommodation: ${booking.status}`);
  }
}

async function assertNewFlightScheduledOrThrow(
  newFlightId: string,
  currentFlightId: string,
  conflictMsg: string,
) {
  if (newFlightId === currentFlightId) {
    throw new ConflictError('New flight must be different from current flight');
  }
  const newFlight = await flightRepository.findById(newFlightId);
  if (newFlight.status !== FlightStatus.SCHEDULED) {
    throw new ConflictError(conflictMsg);
  }
  return newFlight;
}

export const bookingService = {
  async findById(id: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await getBookingByIdOrThrow(id, bookingAdminInclude) as BookingAdmin;

    if (!hasBookingPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return booking;
  },

  async findByBookingRef(bookingRef: string, session: Session) {
    checkPermission(session, 'read');

    const booking = await getBookingByBookingRefOrThrow(bookingRef, bookingAdminInclude) as BookingAdmin;

    if (!hasBookingPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('read');
    }

    return booking;
  },

  async findMine(session: Session) {
    checkPermission(session, 'read');
    return bookingRepository.findByUserId(session.user.id, bookingAdminInclude) as Promise<BookingAdmin[]>;
  },

  async findByFlightId(flightId: string, session: Session) {
    checkPermission(session, 'read');

    const bookings = await bookingRepository.findByFlightId(flightId, bookingAdminInclude) as BookingAdmin[];
    if (hasBookingPermission(session, 'read-all')) return bookings;

    return bookings.filter((b) => b.userId === session.user.id);
  },

  async findByFlightCode(flightCode: string, session: Session) {
    checkPermission(session, 'read');

    const normalizedCode = flightCode.trim().toUpperCase();
    const bookings = await bookingRepository.findByFlightCode(normalizedCode, bookingAdminInclude) as BookingAdmin[];
    if (hasBookingPermission(session, 'read-all')) return bookings;

    return bookings.filter((b) => b.userId === session.user.id);
  },

  async findAll(session: Session) {
    checkPermission(session, 'read-all');
    return bookingRepository.findAll({ include: bookingAdminInclude }) as Promise<BookingAdmin[]>;
  },

  async findAllPaginated(
    session: Session,
    params?: PaginationParams<Prisma.BookingWhereInput>,
  ): Promise<PaginatedResponse<BookingListItem>> {
    checkPermission(session, 'read-all');

    const { page, limit, skip } = resolvePagination(params);
    const [data, total] = await Promise.all([
      bookingRepository.findMany({ where: params?.where, skip, take: limit, include: bookingAdminInclude }) as Promise<BookingAdmin[]>,
      bookingRepository.count(params?.where),
    ]);

    return {
      data: data as BookingAdmin[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async createBooking(input: CreateBookingInput, session: Session) {
    checkPermission(session, 'create');

    const data = createBookingSchema.parse(input);

    if (!hasBookingPermission(session, 'read-all') && data.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    await assertFlightExists(data.flightId);
    const bookingRef = await resolveBookingRef(data.bookingRef);

    return bookingRepository.create({ ...data, bookingRef }, bookingAdminInclude);
  },

  async createBookingWithTickets(input: CreateBookingWithTicketsInput, session: Session) {
    checkPermission(session, 'create');

    const data = createBookingWithTicketsSchema.parse(input);

    if (!hasBookingPermission(session, 'read-all') && data.userId !== session.user.id) {
      throw new UnauthorizedError('create');
    }

    assertPassengerLimit(data.tickets);
    assertBookingTotalMatchesTickets(data.totalPrice, data.tickets);

    await assertFlightExists(data.flightId);
    await assertSeatAssignmentsAvailable(data.flightId, data.tickets);
    const bookingRef = await resolveBookingRef(data.bookingRef);

    return bookingRepository.createWithTickets({
      booking: {
        bookingRef,
        userId: data.userId,
        flightId: data.flightId,
        totalPrice: data.totalPrice,
        currency: data.currency,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
      tickets: data.tickets,
    }, bookingAdminInclude);
  },

  async createGuestBooking(input: CreateGuestBookingInput) {
    const data = createGuestBookingSchema.parse(input);

    await assertFlightExists(data.flightId);
    const bookingRef = await resolveBookingRef(data.bookingRef);

    const guestUser = await createGuestUserForBooking(data.contactEmail, data.guestName, data.contactPhone);

    return bookingRepository.create({
      bookingRef,
      userId: guestUser.id,
      flightId: data.flightId,
      totalPrice: data.totalPrice,
      currency: data.currency,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone,
    }, bookingAdminInclude);
  },

  async createGuestBookingWithTickets(input: CreateGuestBookingWithTicketsInput) {
    const data = createGuestBookingWithTicketsSchema.parse(input);

    assertPassengerLimit(data.tickets);
    assertBookingTotalMatchesTickets(data.totalPrice, data.tickets);

    await assertFlightExists(data.flightId);
    await assertSeatAssignmentsAvailable(data.flightId, data.tickets);
    const bookingRef = await resolveBookingRef(data.bookingRef);

    const guestUser = await createGuestUserForBooking(data.contactEmail, data.guestName, data.contactPhone);

    return bookingRepository.createWithTickets({
      booking: {
        bookingRef,
        userId: guestUser.id,
        flightId: data.flightId,
        totalPrice: data.totalPrice,
        currency: data.currency,
        contactEmail: data.contactEmail,
        contactPhone: data.contactPhone,
      },
      tickets: data.tickets,
    }, bookingAdminInclude);
  },

  async cancelBooking(id: string, session: Session) {
    checkPermission(session, 'cancel');

    const booking = await getBookingByIdOrThrow(id);

    if (!hasBookingPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('cancel');
    }

    assertBookingNotCancelled(booking);

    return bookingRepository.updateStatus(id, BookingStatus.CANCELLED, bookingAdminInclude);
  },

  async changeFlight(id: string, input: ChangeFlightInput, session: Session) {
    checkPermission(session, 'read');
    checkPermission(session, 'cancel');
    checkPermission(session, 'create');

    const booking = await getBookingByIdOrThrow(id, bookingAdminInclude) as BookingAdmin;

    if (!hasBookingPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('change-flight');
    }

    assertBookingNotCancelled(booking);

    if (!canForceChangeFromStatus(booking.flight.status)) {
      throw new ConflictError(
        `Flight change is only allowed for disrupted flights. Current status: ${booking.flight.status}`,
      );
    }

    const data = changeFlightSchema.parse(input);

    await assertNewFlightScheduledOrThrow(data.newFlightId, booking.flightId, 'New flight must be SCHEDULED');

    const newBookingRef = await generateUniqueBookingRef();
    const changedBooking = await bookingRepository.changeFlight({
      bookingId: id,
      newFlightId: data.newFlightId,
      newBookingRef,
      totalPrice: data.totalPrice,
      currency: data.currency,
      keepSeatAssignments: data.keepSeatAssignments,
    }, bookingAdminInclude);

    if (!changedBooking) throw new NotFoundError(`Booking not found: ${id}`);
    return changedBooking;
  },

  async acceptReaccommodation(id: string, input: AcceptReaccommodationInput, session: Session) {
    checkPermission(session, 'read');
    checkPermission(session, 'cancel');
    checkPermission(session, 'create');

    const booking = await getBookingByIdOrThrow(id);

    if (!hasBookingPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('accept-reaccommodation');
    }

    assertBookingIsPendingReaccommodation(booking);

    const data = acceptReaccommodationSchema.parse(input);

    await assertNewFlightScheduledOrThrow(
      data.newFlightId,
      booking.flightId,
      'Selected flight is not available for reaccommodation',
    );

    const newBookingRef = await generateUniqueBookingRef();
    const changedBooking = await bookingRepository.changeFlight({
      bookingId: id,
      newFlightId: data.newFlightId,
      newBookingRef,
      totalPrice: data.totalPrice,
      currency: data.currency,
      keepSeatAssignments: false,
    }, bookingAdminInclude);

    if (!changedBooking) throw new NotFoundError(`Booking not found: ${id}`);
    return changedBooking;
  },

  async cancelForReaccommodation(
    id: string,
    input: CancelReaccommodationInput,
    session: Session,
  ) {
    checkPermission(session, 'cancel');
    checkPermission(session, 'read');

    const booking = await getBookingByIdOrThrow(id);

    if (!hasBookingPermission(session, 'read-all') && booking.userId !== session.user.id) {
      throw new UnauthorizedError('cancel-reaccommodation');
    }

    assertBookingIsPendingReaccommodation(booking);

    const { reason } = cancelReaccommodationSchema.parse(input ?? {});
    await paymentService.refundBookingForReaccommodation(
      id,
      reason ?? 'Passenger cancelled during reaccommodation',
    );

    return bookingRepository.updateStatus(id, BookingStatus.CANCELLED, bookingAdminInclude);
  },
};

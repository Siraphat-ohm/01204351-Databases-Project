# YokAirlines Service Layer – Current Documentation

_Last updated: 2026-02-21_

This document summarizes the current `src/services` layer for teammate handoff.

## 1) Service Architecture

- Services are under `src/services/*.services.ts`
- Data access is delegated to `src/repositories/*.repository.ts`
- Input validation uses Zod schemas in `src/types/*` and `src/schema/*`
- Authorization is centralized in `src/auth/permissions.ts`
- Shared service helpers:
  - `src/services/_shared/session.ts` (`ServiceSession`)
  - `src/services/_shared/authorization.ts` (`assertPermission`, `hasPermission`)
  - `src/services/_shared/pagination.ts` (`resolvePagination`)

## 2) Session / Auth Model

`ServiceSession` shape:

- `user.id: string`
- `user.role: string`

Pattern used by services:

- `checkPermission(session, action)` -> calls `assertPermission(...)`
- Throws domain `UnauthorizedError` when role lacks access

## 3) Pagination Conventions

Shared input type:

- `PaginationParams` (`page?`, `limit?`)

Shared normalization:

- `resolvePagination(params)`
  - default `page = 1`
  - default `limit = 20`
  - max `limit = 100`
  - returns `{ page, limit, skip }`

Standard paginated output:

- `PaginatedResponse<T>` with
  - `data: T[]`
  - `meta: { page, limit, total, totalPages }`

## 4) Service-by-Service Summary

### 4.0 `authService` helpers

Files:

- `src/services/auth.services.ts` (server)
- `src/services/auth-client.service.ts` (client)

Server methods:

- `getServerSession()`
- `getServerUser()`
- `getRoleFromSession(session)`
- `hasRole(session, roleOrRoles)`
- `requireServerSession()`
- `requireServerUser()`
- `requireRole(roleOrRoles)`

Client helpers:

- `signInWithEmail({ email, password, callbackURL?, rememberMe? })`
- `signUpWithEmail({ name, email, password, callbackURL? })`
- `signOutCurrentUser()`
- `useAuthSession`
- `getRoleFromClientSession(sessionState)`
- `hasRoleClient(sessionState, roleOrRoles)`
- `useRole()`
- `useHasRole(roleOrRoles)`

Errors:

- `AuthenticationRequiredError`
- `AuthorizationError`

### 4.0.1 `userService`

Files:

- `src/services/user.services.ts`
- `src/repositories/user.repository.ts`
- `src/types/user.type.ts`

Methods:

- `findMe(session)`
- `findById(id, session)` (admin)
- `findAll(session)` (admin)
- `findAllPaginated(session, params)` (admin)
- `updateMyProfile(input, session)`
- `updateRole(id, input, session)` (admin)

Errors:

- `UserNotFoundError`
- `UnauthorizedError`

### 4.1 `aircraftService`

File: `src/services/aircraft.services.ts`

Methods:

- `findById(id, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createAircraft(input, session)`
- `updateAircraft(id, input, session)`
- `updateStatus(id, status, session)`
- `deleteAircraft(id, session)`

Errors:

- `AircraftNotFoundError`
- `AircraftConflictError`
- `AircraftInUseError`
- `UnauthorizedError`

### 4.1.1 `aircraftTypeService`

Files:

- `src/services/aircraft-type.services.ts`
- `src/repositories/aircraft-type.repository.ts`
- `src/types/aircraft-type.type.ts`

Methods:

- `findById(id, session)`
- `findByIataCode(iataCode, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createAircraftType(input, session)`
- `updateAircraftType(id, input, session)`
- `deleteAircraftType(id, session)`

Errors:

- `AircraftTypeNotFoundError`
- `AircraftTypeConflictError`
- `AircraftTypeInUseError`
- `UnauthorizedError`

### 4.2 `airportService`

File: `src/services/airport.services.ts`

Methods:

- `findById(id, session)`
- `findByIataCode(iataCode, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createAirport(input, session)`
- `updateAirport(id, input, session)`
- `deleteAirport(id, session)`

Errors:

- `AirportNotFoundError`
- `AirportConflictError`
- `AirportInUseError`
- `UnauthorizedError`

### 4.3 `staffService`

File: `src/services/staff.services.ts`

Methods:

- `findById(id, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createStaff(input, session)`
- `updateStaff(id, input, session)`
- `deleteStaff(id, session)`

Errors:

- `StaffNotFoundError`
- `StaffConflictError`
- `StaffInUseError`
- `UnauthorizedError`

### 4.4 `routeService`

File: `src/services/route.services.ts`

Methods:

- `findById(id, session)`
- `findByIataCodes(originCode, destCode, session)`
- `getOriginAirports(session)`
- `getDestinationsFromOrigin(originCode, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createRoute(input, session)`
- `updateRoute(id, input, session)`
- `deleteRoute(id, session)`

Errors:

- `RouteNotFoundError`
- `RouteConflictError`
- `RouteHasActiveFlightsError`
- `UnauthorizedError`

Notes:

- Pagination currently slices in-memory from `findAll()` result.

### 4.5 `flightService`

File: `src/services/flight.services.ts`

Methods:

- `findById(id, session)`
- `findByCode(code, session)`
- `findAll(session)`
- `searchWithAvailability(params, session)`
- `findDetailWithAvailability(params, session)`
- `findPublicDetailWithAvailability(params)`
- `createFlight(input, session)`
- `updateFlight(id, input, session)`
- `updateStatus(id, status, session)`
- `changeAircraftAndReassignSeats(id, input, session)`
- `deleteFlight(id, session)`

Errors:

- `FlightNotFoundError`
- `FlightConflictError`
- `FlightInUseError`
- `AircraftNotFoundError`
- `FlightSeatReassignmentError`
- `UnauthorizedError`

Public behavior:

- Uses internal `PUBLIC_SESSION` (`role = PASSENGER`) for public detail lookup.
- Public detail returns `null` unless flight status is `SCHEDULED`.

### 4.6 `seatService` functions

File: `src/services/seat.services.ts`

Functions:

- `getSeatAvailability(flightId, aircraftTypeIataCode)`
- `getBulkSeatAvailability(flights)`
- `getFlightSeatLayout(flightCode, options?)`

Notes:

- `getFlightSeatLayout(..., { includeOccupants: true })` can include occupant details in `layout.occupantsBySeat`.

### 4.7 `bookingService`

File: `src/services/booking.services.ts`

Methods:

- `findById(id, session)`
- `findByBookingRef(bookingRef, session)`
- `findMine(session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createBooking(input, session)`
- `cancelBooking(id, session)`
- `changeFlight(id, input, session)`
- `acceptReaccommodation(id, input, session)`
- `cancelForReaccommodation(id, input, session)`

Errors:

- `BookingNotFoundError`
- `BookingConflictError`
- `BookingAlreadyCancelledError`
- `BookingChangeNotAllowedError`
- `BookingReaccommodationError`
- `UnauthorizedError`

Notes:

- `findAllPaginated` currently slices in-memory from `findAll()` result.

### 4.8 `ticketService`

File: `src/services/ticket.services.ts`

Methods:

- `findById(id, session)`
- `findMine(session)`
- `findByBookingId(bookingId, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `checkInTicket(id, input, session)`

Errors:

- `TicketNotFoundError`
- `TicketConflictError`
- `TicketAlreadyCheckedInError`
- `UnauthorizedError`

Notes:

- `findAllPaginated` currently slices in-memory from `findAll()` result.

### 4.9 `paymentService`

File: `src/services/payment.services.ts`

Methods:

- `findById(id, session)`
- `findByBookingId(bookingId, session)`
- `findMine(session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createPayment(input, session)`
- `markPaymentSuccess(id, input, session)`
- `markPaymentFailed(id, input, session)`
- `refundPayment(id, input, session)`
- `refundBookingForReaccommodation(bookingId, reason?)`

Errors:

- `PaymentNotFoundError`
- `PaymentConflictError`
- `BookingNotFoundError`
- `UnauthorizedError`

Notes:

- `findAllPaginated` currently slices in-memory from `findAll()` result.

## 5) Current Public Flight APIs

- `GET /api/v1/flights`
  - calls `flightService.searchWithAvailability(...)` with public session
  - list query is restricted to `SCHEDULED` in repository search

- `GET /api/v1/flights/[code]`
  - calls `flightService.findPublicDetailWithAvailability(...)`
  - returns not found when flight is not `SCHEDULED`

## 6) Error Response Utility (API)

File: `src/lib/utils/api-response.ts`

Common helpers:

- `successResponse`
- `errorResponse`
- `notFoundResponse`
- `validationErrorResponse`
- `zodFieldErrors` (shared Zod issue mapping)

## 7) Recommended Next Improvements

- Move in-memory pagination (`route/booking/ticket/payment`) to repository-level `skip/take/count` for large datasets.
- Consider a shared `DomainUnauthorizedError` base class to reduce repetitive unauthorized classes.
- Add service-level tests for:
  - permission denied
  - not found/conflict cases
  - pagination metadata correctness

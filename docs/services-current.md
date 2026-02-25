# YokAirlines Service Layer – Current Documentation

_Last updated: 2026-02-25_

This document summarizes the current `src/services` layer for teammate handoff.

## 1) Service Architecture

- Services are under `src/services/*.services.ts`
- Data access is delegated to `src/repositories/*.repository.ts`
- Input validation uses Zod schemas in `src/types/*` and `src/schema/*`
- Authorization is centralized in `src/auth/permissions.ts`
- Shared service helpers:
  - `src/services/_shared/session.ts` (`ServiceSession`)
  - `src/services/_shared/authorization.ts` (`assertPermission`, `hasPermission`)
  - `src/services/_shared/role.ts` (`hasAnyRole`, `assertAnyRole`)
  - `src/services/_shared/pagination.ts` (`resolvePagination`)

- API protection helper:
  - `src/lib/utils/rate-limit.ts` (`checkRateLimit`, `getClientIpFromHeaders`, `enforceApiRateLimit`)

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
- `searchPaginated(search, session, params)`
- `createAirport(input, session)`
- `updateAirport(id, input, session)`
- `deleteAirport(id, session)`

Errors:

- `AirportNotFoundError`
- `AirportConflictError`
- `AirportInUseError`
- `UnauthorizedError`

API routes:

- `GET /api/v1/airports`
  - supports `search`
  - supports `page` + `limit`
  - also supports legacy `skip` + `take`

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

### 4.3.1 `crewProfileService` (Mongo)

Files:

- `src/services/crew-profile.services.ts`
- `src/repositories/crew-profile.repository.ts`
- `src/types/crew-profile.type.ts`
- `src/models/CrewProfile.ts`

Methods:

- `findAll(session)` (admin)
- `findAllPaginated(session, params)` (admin)
- `findByUserId(userId, session)`
- `findMyProfile(session)`
- `upsertMyProfile(input, session)`
- `patchByUserId(userId, input, session)`
- `create(input, session)` (admin)
- `updateByUserId(userId, input, session)` (admin)
- `deleteByUserId(userId, session)` (admin)

Errors:

- `CrewProfileNotFoundError`
- `CrewProfileConflictError`
- `UnauthorizedError`

API routes:

- `GET /api/v1/crew-profiles`
  - supports `page` + `limit`
  - admin only
- `POST /api/v1/crew-profiles`
  - admin only
- `GET /api/v1/crew-profiles/me`
- `PUT /api/v1/crew-profiles/me`
- `GET /api/v1/crew-profiles/[userId]`
- `PATCH /api/v1/crew-profiles/[userId]`
  - admin uses generic update
  - non-admin can patch own profile only
- `DELETE /api/v1/crew-profiles/[userId]`
  - admin only

### 4.3.2 `issueReportService` (Mongo)

Files:

- `src/services/issue-report.services.ts`
- `src/repositories/issue-report.repository.ts`
- `src/types/issue-report.type.ts`
- `src/models/IssueReport.ts`

Methods:

- `findById(id, session)`
- `findMine(session)`
- `findAll(session)` (admin)
- `findMinePaginated(session, params)`
- `findAllPaginated(session, params)` (admin)
- `createMine(input, session)`
- `create(input, session)` (admin)
- `updateStatus(id, input, session)` (admin)
- `updateById(id, input, session)` (admin)
- `deleteById(id, session)` (admin)

Errors:

- `IssueReportNotFoundError`
- `UnauthorizedError`

API routes:

- `GET /api/v1/issues`
  - supports `page` + `limit`
  - admin gets all issues (paginated)
  - non-admin gets own issues (paginated)
- `POST /api/v1/issues`
  - admin can create for any user by passing `userId`
- `GET /api/v1/issues/[id]`
- `PATCH /api/v1/issues/[id]`
- `DELETE /api/v1/issues/[id]`

### 4.3.3 `paymentLogService` (Mongo)

Files:

- `src/services/payment-log.services.ts`
- `src/repositories/payment-log.repository.ts`
- `src/types/payment-log.type.ts`
- `src/models/PaymentLog.ts`

Methods:

- `findById(id, session)`
- `findByBookingId(bookingId, session)`
- `findAll(session)` (admin)
- `findAllPaginated(session, params)` (admin)
- `create(input, session)` (admin)
- `updateById(id, input, session)` (admin)
- `deleteById(id, session)` (admin)

Errors:

- `PaymentLogNotFoundError`
- `BookingNotFoundError`
- `UnauthorizedError`

API routes:

- `GET /api/v1/payment-logs`
  - supports `page` + `limit` when listing all logs (admin)
  - `bookingId=...` returns logs for one booking (no pagination)
- `POST /api/v1/payment-logs`
- `GET /api/v1/payment-logs/[id]`
- `PATCH /api/v1/payment-logs/[id]`
- `DELETE /api/v1/payment-logs/[id]`

### 4.3.4 `flightOpsLogService` (Mongo)

Files:

- `src/services/flight-ops-log.services.ts`
- `src/repositories/flight-ops-log.repository.ts`
- `src/types/flight-ops-log.type.ts`
- `src/models/FlightOpsLog.ts`

Methods:

- `findById(id, session)`
- `findByFlightId(flightId, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `upsertByFlightId(flightId, input, session)`
- `patchById(id, input, session)`
- `deleteById(id, session)`

Errors:

- `FlightOpsLogNotFoundError`
- `FlightNotFoundError`
- `UnauthorizedError`

API routes:

- `GET /api/v1/flight-ops-logs`
  - supports `page` + `limit` when `flightId` is not provided
- `PUT /api/v1/flight-ops-logs?flightId=...`
- `GET /api/v1/flight-ops-logs/[id]`
- `PATCH /api/v1/flight-ops-logs/[id]`
- `DELETE /api/v1/flight-ops-logs/[id]`

### 4.4 `routeService`

File: `src/services/route.services.ts`

Methods:

- `findById(id, session)`
- `findByIataCodes(originCode, destCode, session)`
- `getOriginAirports(session)`
- `getDestinationsFromOrigin(originCode, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `searchPaginated(search, session, params)`
- `createRoute(input, session)`
- `updateRoute(id, input, session)`
- `deleteRoute(id, session)`

Errors:

- `RouteNotFoundError`
- `RouteConflictError`
- `RouteHasActiveFlightsError`
- `UnauthorizedError`

Notes:

- Pagination uses repository-level `skip/take` plus `count()`.

API routes:

- `GET /api/v1/routes`
  - supports `search`
  - supports `page` + `limit`
  - also supports legacy `skip` + `take`
- `POST /api/v1/routes`
- `PATCH /api/v1/routes`
  - expects `id` in body
- `DELETE /api/v1/routes`
  - accepts `id` via query or JSON body

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
- `findByFlightId(flightId, session)`
- `findByFlightCode(flightCode, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `createBooking(input, session)`
- `createBookingWithTickets(input, session)`
- `createGuestBooking(input)`
- `createGuestBookingWithTickets(input)`
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
- `BookingSeatConflictError`
- `UnauthorizedError`

Notes:

- `findAllPaginated` uses repository-level `skip/take` plus `count()`.
- `findByFlightCode` normalizes input with `trim().toUpperCase()`.
- Non-admin users only receive their own bookings for `findByFlightId`/`findByFlightCode`.

API routes:

- `GET /api/v1/bookings`
  - supports filters: `bookingRef`, `flightId`, `flightCode`, `mine`
  - supports `page` + `limit` for read-all roles when no filter is set
  - non read-all roles default to own bookings when no filter is set
- `POST /api/v1/bookings`
  - authenticated: existing behavior (`userId` checked against session unless read-all role)
  - guest (no session): supports booking by `contactEmail` without account
  - guest payload does not require `userId`
  - optional `guestName` used for generated guest user profile
  - when body includes non-empty `tickets[]`, booking + all tickets are created together in one transaction
  - validates duplicate seats in request and already-assigned seats on the flight
- `GET /api/v1/bookings/[id]`
- `PATCH /api/v1/bookings/[id]`
  - action-based: `cancel`, `change-flight`, `accept-reaccommodation`, `cancel-reaccommodation`
- `DELETE /api/v1/bookings/[id]`
  - alias of cancel booking

### 4.8 `ticketService`

File: `src/services/ticket.services.ts`

Methods:

- `createTicket(input, session)`
- `findById(id, session)`
- `findMine(session)`
- `findByBookingId(bookingId, session)`
- `findByFlightId(flightId, session)`
- `findByFlightCode(flightCode, session)`
- `findAll(session)`
- `findAllPaginated(session, params)`
- `updateTicket(id, input, session)`
- `checkInTicket(id, input, session)`
- `deleteTicket(id, session)`

Errors:

- `TicketNotFoundError`
- `TicketConflictError`
- `TicketAlreadyCheckedInError`
- `UnauthorizedError`

Notes:

- `findAllPaginated` uses repository-level `skip/take` plus `count()`.
- `findByFlightCode` normalizes input with `trim().toUpperCase()`.
- Non-admin users only receive their own tickets for `findByFlightId`/`findByFlightCode`.

API routes:

- `GET /api/v1/tickets`
  - supports filters: `bookingId`, `flightId`, `flightCode`, `mine`
  - supports `page` + `limit` for read-all roles when no filter is set
  - non read-all roles default to own tickets when no filter is set
- `POST /api/v1/tickets`
- `GET /api/v1/tickets/[id]`
- `PATCH /api/v1/tickets/[id]`
- `DELETE /api/v1/tickets/[id]`
- `PATCH /api/v1/tickets/[id]/check-in`

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

- `findAllPaginated` uses repository-level `skip/take` plus `count()`.

API routes:

- `GET /api/v1/payments`
  - supports `bookingId` filter
  - supports `mine`
  - supports `page` + `limit` for read-all roles when no filter is set
- `POST /api/v1/payments`
- `GET /api/v1/payments/[id]`
- `PATCH /api/v1/payments/[id]`
  - action-based: `mark-success`, `mark-failed`, `refund`

### 4.9.1 Action Contract Cheatsheet

Booking action endpoint: `PATCH /api/v1/bookings/[id]`

- `cancel`
  - body: `{ "action": "cancel" }`
- `change-flight`
  - body: `{ "action": "change-flight", "newFlightId": "<cuid>", "reason"?: "FLIGHT_CANCELLED|MAJOR_DELAY|ROUTE_DISRUPTION|AIRCRAFT_DOWNSIZE", "keepSeatAssignments"?: boolean, "totalPrice"?: number, "currency"?: string }`
- `accept-reaccommodation`
  - body: `{ "action": "accept-reaccommodation", "newFlightId": "<cuid>", "totalPrice"?: number, "currency"?: string }`
- `cancel-reaccommodation`
  - body: `{ "action": "cancel-reaccommodation", "reason"?: string }`

Payment action endpoint: `PATCH /api/v1/payments/[id]`

- `mark-success`
  - body: `{ "action": "mark-success", "stripeChargeId"?: string }`
- `mark-failed`
  - body: `{ "action": "mark-failed", "failureCode"?: string, "failureMessage"?: string }`
- `refund`
  - body: `{ "action": "refund", "amount"?: number, "reason"?: string }`

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
- `unauthorizedResponse`
- `tooManyRequestsResponse`
- `notFoundResponse`
- `validationErrorResponse`
- `zodFieldErrors` (shared Zod issue mapping)

## 7) API Protection Notes

- Mongo API routes now enforce both:
  - session auth (`getServerSession`)
  - service-level authorization (`UnauthorizedError` with role/ownership checks)
- Added lightweight in-memory rate limiting on new Mongo endpoints:
  - `crew-profiles`
  - `issues`
  - `payment-logs`
  - `flight-ops-logs`

## 8) API Classification (contract boundary)

Tag meaning:

- `public-contract`: keep versioned and stable for external/mobile/integration clients
- `internal-admin`: optional API; can be replaced by server-component/server-action direct service calls

`public-contract`:

- `GET /api/v1/flights`
- `GET /api/v1/flights/[code]`
- `GET /api/v1/flights/[code]/seats`
- `GET /api/v1/bookings`
- `POST /api/v1/bookings`
- `GET /api/v1/bookings/[id]`
- `PATCH /api/v1/bookings/[id]`
- `DELETE /api/v1/bookings/[id]`
- `GET /api/v1/tickets`
- `POST /api/v1/tickets`
- `GET /api/v1/tickets/[id]`
- `PATCH /api/v1/tickets/[id]`
- `DELETE /api/v1/tickets/[id]`
- `PATCH /api/v1/tickets/[id]/check-in`
- `GET /api/v1/payments`
- `POST /api/v1/payments`
- `GET /api/v1/payments/[id]`
- `PATCH /api/v1/payments/[id]`
- `GET /api/openapi`

`internal-admin`:

- `GET /api/v1/airports`
- `GET /api/v1/routes`
- `POST /api/v1/routes`
- `PATCH /api/v1/routes`
- `DELETE /api/v1/routes`
- `GET /api/v1/crew-profiles`
- `POST /api/v1/crew-profiles`
- `GET /api/v1/crew-profiles/me`
- `PUT /api/v1/crew-profiles/me`
- `GET /api/v1/crew-profiles/[userId]`
- `PATCH /api/v1/crew-profiles/[userId]`
- `DELETE /api/v1/crew-profiles/[userId]`
- `GET /api/v1/issues`
- `POST /api/v1/issues`
- `GET /api/v1/issues/[id]`
- `PATCH /api/v1/issues/[id]`
- `DELETE /api/v1/issues/[id]`
- `GET /api/v1/payment-logs`
- `POST /api/v1/payment-logs`
- `GET /api/v1/payment-logs/[id]`
- `PATCH /api/v1/payment-logs/[id]`
- `DELETE /api/v1/payment-logs/[id]`
- `GET /api/v1/flight-ops-logs`
- `PUT /api/v1/flight-ops-logs?flightId=...`
- `GET /api/v1/flight-ops-logs/[id]`
- `PATCH /api/v1/flight-ops-logs/[id]`
- `DELETE /api/v1/flight-ops-logs/[id]`

## 9) Recommended Next Improvements

- Consider a shared `DomainUnauthorizedError` base class to reduce repetitive unauthorized classes.
- Add service-level tests for:
  - permission denied
  - not found/conflict cases
  - pagination metadata correctness

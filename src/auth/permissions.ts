import { createAccessControl } from 'better-auth/plugins/access';


export const statement = {
  route:    ['create', 'read', 'update', 'delete'],
  flight:   ['create', 'read', 'update', 'delete', 'manage-status'],
  booking:  ['create', 'read', 'cancel', 'read-all'],
  ticket:   ['read', 'update', 'check-in', 'read-all'],
  payment:  ['create', 'read', 'refund', 'read-all'],
  airport:  ['create', 'read', 'update', 'delete'],
  aircraft: ['create', 'read', 'update', 'delete', 'manage-status'],
  staff:    ['create', 'read', 'update', 'delete'],
} as const;

export const ac = createAccessControl(statement);


export const passengerRole = ac.newRole({
  route:   ['read'],
  flight:  ['read'],
  booking: ['create', 'read', 'cancel'],
  ticket:  ['read'],
  payment: ['create', 'read'],
  airport: ['read'],
});

export const groundStaffRole = ac.newRole({
  route:   ['read'],
  flight:  ['read'],
  booking: ['read-all'],
  ticket:  ['read-all', 'update', 'check-in'],
  payment: ['read-all'],
  airport: ['read'],
});

export const cabinCrewRole = ac.newRole({
  route:   ['read'],
  flight:  ['read'],
  ticket:  ['read-all'],
  airport: ['read'],
});

export const pilotRole = ac.newRole({
  route:   ['read'],
  flight:  ['read'],
  ticket:  ['read-all'],
  airport: ['read'],
});

export const mechanicRole = ac.newRole({
  aircraft: ['read', 'manage-status'],
  flight:   ['read'],
  airport:  ['read'],
});

export const adminRole = ac.newRole({
  route:    ['create', 'read', 'update', 'delete'],
  flight:   ['create', 'read', 'update', 'delete', 'manage-status'],
  booking:  ['create', 'read', 'cancel', 'read-all'],
  ticket:   ['read', 'update', 'check-in', 'read-all'],
  payment:  ['create', 'read', 'refund', 'read-all'],
  airport:  ['create', 'read', 'update', 'delete'],
  aircraft: ['create', 'read', 'update', 'delete', 'manage-status'],
  staff:    ['create', 'read', 'update', 'delete'],
});

export const rolePermissions = {
  PASSENGER:   passengerRole,
  GROUND_STAFF: groundStaffRole,
  CABIN_CREW:  cabinCrewRole,
  PILOT:       pilotRole,
  MECHANIC:    mechanicRole,
  ADMIN:       adminRole,
} as const;

export type RoleKey = keyof typeof rolePermissions;
export type RouteAction = (typeof statement.route)[number];
export type AirportAction = (typeof statement.airport)[number];
export type AircraftAction = (typeof statement.aircraft)[number];
export type StaffAction = (typeof statement.staff)[number];
export type FlightAction = (typeof statement.flight)[number];
export type BookingAction = (typeof statement.booking)[number];
export type TicketAction = (typeof statement.ticket)[number];
export type PaymentAction = (typeof statement.payment)[number];

export function canAccessRoute(roleName: string, action: RouteAction): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.route;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessAirport(
  roleName: string,
  action: AirportAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.airport;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessAircraft(
  roleName: string,
  action: AircraftAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.aircraft;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessStaff(
  roleName: string,
  action: StaffAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.staff;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessFlight(
  roleName: string,
  action: FlightAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.flight;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessBooking(
  roleName: string,
  action: BookingAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.booking;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessTicket(
  roleName: string,
  action: TicketAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.ticket;
  return Array.isArray(allowed) && allowed.includes(action);
}

export function canAccessPayment(
  roleName: string,
  action: PaymentAction,
): boolean {
  const role = rolePermissions[roleName as RoleKey];
  if (!role) return false;

  const statements = role.statements as unknown as Partial<
    Record<keyof typeof statement, readonly string[]>
  >;
  const allowed = statements.payment;
  return Array.isArray(allowed) && allowed.includes(action);
}
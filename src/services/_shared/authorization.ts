import type { ServiceSession } from '@/services/_shared/session';

type CanAccessFn<Action extends string> = (roleName: string, action: Action) => boolean;
type UnauthorizedFactory<Action extends string> = (action: Action) => Error;

export function assertPermission<Action extends string>(
  session: ServiceSession,
  action: Action,
  canAccess: CanAccessFn<Action>,
  resource: string,
  unauthorizedFactory?: UnauthorizedFactory<Action>,
) {
  if (canAccess(session.user.role, action)) return;

  if (unauthorizedFactory) {
    throw unauthorizedFactory(action);
  }

  throw new Error(`Unauthorized: cannot perform "${action}" on ${resource}`);
}

export function hasPermission<Action extends string>(
  session: ServiceSession,
  action: Action,
  canAccess: CanAccessFn<Action>,
) {
  return canAccess(session.user.role, action);
}

/**
 * Convenience wrapper that calls `assertPermission` directly.
 * Use when you don't need a pre-bound checker.
 */
export function checkPermission<Action extends string>(
  session: ServiceSession,
  action: Action,
  canAccess: CanAccessFn<Action>,
  resource: string,
  unauthorizedFactory?: UnauthorizedFactory<Action>,
) {
  return assertPermission(session, action, canAccess, resource, unauthorizedFactory);
}

/**
 * Create a pre-bound `checkPermission` function for a specific resource and `canAccess` predicate.
 * Services can call the returned function as `checkPermission(session, 'read')`.
 */
export function makeCheckPermission<Action extends string>(
  canAccess: CanAccessFn<Action>,
  resource: string,
  unauthorizedFactory?: UnauthorizedFactory<Action>,
) {
  return (session: ServiceSession, action: Action) =>
    assertPermission(session, action, canAccess, resource, unauthorizedFactory);
}

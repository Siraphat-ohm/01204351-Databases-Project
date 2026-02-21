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

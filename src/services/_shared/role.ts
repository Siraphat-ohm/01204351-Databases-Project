import type { ServiceSession } from '@/services/_shared/session';

export function hasAnyRole(session: ServiceSession, roles: readonly string[]) {
  return roles.includes(session.user.role);
}

export function assertAnyRole(
  session: ServiceSession,
  roles: readonly string[],
  onFail: () => Error,
) {
  if (!hasAnyRole(session, roles)) {
    throw onFail();
  }
}

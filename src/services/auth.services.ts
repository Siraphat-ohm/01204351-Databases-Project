import { headers } from "next/headers";
import { auth, type AuthSession } from "@/lib/auth";
import type { RoleKey } from "@/auth/permissions";

export class AuthenticationRequiredError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationError extends Error {
  constructor(message = "Insufficient role") {
    super(message);
    this.name = "AuthorizationError";
  }
}

type MaybeSession = AuthSession | null;

function roleList(roleOrRoles: RoleKey | RoleKey[]): RoleKey[] {
  return Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
}

export async function getServerSession(): Promise<AuthSession | null> {
  return auth.api.getSession({
    headers: await headers(),
  });
}

export async function getServerUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}

export function getRoleFromSession(session: MaybeSession): string | null {
  return session?.user?.role ?? null;
}

export function hasRole(session: MaybeSession, roleOrRoles: RoleKey | RoleKey[]): boolean {
  const role = getRoleFromSession(session);
  if (!role) return false;
  return roleList(roleOrRoles).includes(role as RoleKey);
}

export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new AuthenticationRequiredError();
  }
  return session;
}

export async function requireServerUser() {
  const session = await requireServerSession();
  return session.user;
}

export async function requireRole(roleOrRoles: RoleKey | RoleKey[]): Promise<AuthSession> {
  const session = await requireServerSession();
  if (!hasRole(session, roleOrRoles)) {
    throw new AuthorizationError();
  }
  return session;
}

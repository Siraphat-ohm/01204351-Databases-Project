'use client';

import { signIn, signOut, signUp, useSession } from '@/lib/auth-client';
import type { RoleKey } from '@/auth/permissions';

type AuthResult<T = unknown> = {
  ok: boolean;
  data: T | null;
  error: string | null;
};

function getErrorMessage(error: unknown): string {
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string') return message;
  }
  return 'Authentication failed';
}

function normalizeAuthResult<T = unknown>(result: unknown): AuthResult<T> {
  const value = result as {
    data?: T;
    error?: { message?: string } | string | null;
  };

  if (value?.error) {
    return {
      ok: false,
      data: null,
      error: getErrorMessage(value.error),
    };
  }

  return {
    ok: true,
    data: (value?.data ?? null) as T | null,
    error: null,
  };
}

export async function signInWithEmail(input: {
  email: string;
  password: string;
  callbackURL?: string;
  rememberMe?: boolean;
}) {
  const result = await signIn.email(input);
  return normalizeAuthResult(result);
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  name: string;
  callbackURL?: string;
}) {
  const result = await signUp.email(input);
  return normalizeAuthResult(result);
}

export async function signOutCurrentUser(input?: { fetchOptions?: { onSuccess?: () => void } }) {
  return signOut(input);
}

export const useAuthSession = useSession;

function toRoleList(roleOrRoles: RoleKey | RoleKey[]): RoleKey[] {
  return Array.isArray(roleOrRoles) ? roleOrRoles : [roleOrRoles];
}

type SessionState = {
  data?: {
    user?: {
      role?: string;
    };
  } | null;
};

export function getRoleFromClientSession(sessionState: SessionState): string | null {
  return sessionState?.data?.user?.role ?? null;
}

export function hasRoleClient(
  sessionState: SessionState,
  roleOrRoles: RoleKey | RoleKey[],
): boolean {
  const role = getRoleFromClientSession(sessionState);
  if (!role) return false;
  return toRoleList(roleOrRoles).includes(role as RoleKey);
}

export function useRole() {
  const sessionState = useAuthSession() as SessionState;
  return getRoleFromClientSession(sessionState);
}

export function useHasRole(roleOrRoles: RoleKey | RoleKey[]) {
  const sessionState = useAuthSession() as SessionState;
  return hasRoleClient(sessionState, roleOrRoles);
}

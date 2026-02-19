import { createAuthClient } from "better-auth/react";

export const auth = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_AUTH_BASE_URL || "http://localhost:3000",
});

export const { useSession, signIn, signOut, signUp } = auth;

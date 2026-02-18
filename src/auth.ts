import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Logic to verify user against your database
        // For now, returning a mock user
        if (credentials?.email === "test@yokairlines.com" && credentials?.password === "password123") {
          return { id: "1", name: "Yok Traveler", email: "test@yokairlines.com" };
        }
        return null;
      },
    }),
  ],
  pages: {
    signIn: "/Login", // Custom login page route
  },
});
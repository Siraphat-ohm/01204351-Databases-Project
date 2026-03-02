import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { createCuid } from "@/lib/utils/cuid";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  advanced: {
    database: {
      // Ensure all better-auth records (User, Session, Account, Verification)
      // use CUIDs, consistent with the Prisma schema's @default(cuid()).
      generateId: () => createCuid(),
    },
  },
  emailAndPassword: {
    enabled: true,
    password: {
      hash: async (password: string) => bcrypt.hash(password, 12),
      verify: async ({ password, hash }: { password: string; hash: string }) =>
        bcrypt.compare(password, hash),
    },
  },
  user: {
    additionalFields: {
      role: {
        type: "string", 
        required: true,
        defaultValue: "PASSENGER", 
        input: false,
      },
    },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
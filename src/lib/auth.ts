/**
 * NextAuth config — Google OAuth, JWT sessions.
 * Used by API route and middleware.
 */
import "@/lib/load-env";

import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";

/** Env keys used by auth. Pass from getEnvFromFile() so Next.js doesn't inline empty values. */
export type AuthEnv = {
  AUTH_GOOGLE_ID?: string;
  AUTH_GOOGLE_SECRET?: string;
  AUTH_SECRET?: string;
  NEXTAUTH_URL?: string;
  AUTH_DEV_BYPASS_SECRET?: string;
};

function getAuthOptions(env?: AuthEnv): NextAuthOptions {
  const e = env ?? process.env;
  const providers: NextAuthOptions["providers"] = [
    GoogleProvider({
      clientId: e.AUTH_GOOGLE_ID ?? "",
      clientSecret: e.AUTH_GOOGLE_SECRET ?? "",
    }),
  ];
  // Dev bypass: set AUTH_DEV_BYPASS_SECRET in .env.local to sign in without Google
  if (e.AUTH_DEV_BYPASS_SECRET) {
    providers.push(
      CredentialsProvider({
        id: "dev-bypass",
        name: "Dev bypass",
        credentials: {
          email: { label: "Email", type: "email" },
          password: { label: "Bypass", type: "password" },
        },
        async authorize(credentials) {
          if (
            !credentials?.password ||
            credentials.password !== e.AUTH_DEV_BYPASS_SECRET
          )
            return null;
          return {
            id: "dev-bypass",
            email: credentials.email?.trim() || "dev@local",
            name: "Dev User",
            image: null,
          };
        },
      })
    );
  }
  return {
    providers,
    session: {
      strategy: "jwt",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    pages: {
      signIn: "/signin",
    },
    callbacks: {
      jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.email = user.email;
          token.name = user.name;
          token.picture = user.image;
        }
        return token;
      },
      session({ session, token }) {
        if (session.user) {
          session.user.id = token.id as string;
          session.user.email = token.email as string;
          session.user.name = token.name as string;
          session.user.image = token.picture as string;
        }
        return session;
      },
    },
    secret: e.AUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
  };
}

export const authOptions = getAuthOptions();
export { getAuthOptions };

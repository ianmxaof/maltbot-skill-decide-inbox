import { getEnvFromFile } from "@/lib/load-env";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Use .env.local when present (local dev); otherwise use process.env (e.g. Vercel env vars).
// Patch process.env so NextAuth internals see NEXTAUTH_URL etc.
async function handler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const fromFile = getEnvFromFile();
  const env = { ...process.env, ...fromFile } as Record<string, string>;
  for (const [k, v] of Object.entries(env)) if (v !== undefined) process.env[k] = v;
  const options = getAuthOptions(env);
  const nextAuthHandler = NextAuth(options);
  return nextAuthHandler(req, context);
}

export { handler as GET, handler as POST };

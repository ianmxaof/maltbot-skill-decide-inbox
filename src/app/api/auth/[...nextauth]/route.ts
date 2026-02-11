import { getEnvFromFile } from "@/lib/load-env";
import NextAuth from "next-auth";
import { getAuthOptions } from "@/lib/auth";

// Read env from .env.local (plain object) so Next.js can't inline empty process.env.
// Also patch process.env so NextAuth internals see NEXTAUTH_URL etc.
async function handler(
  req: Request,
  context: { params: Promise<{ nextauth: string[] }> }
) {
  const env = getEnvFromFile();
  for (const [k, v] of Object.entries(env)) process.env[k] = v;
  const options = getAuthOptions(env);
  const nextAuthHandler = NextAuth(options);
  return nextAuthHandler(req, context);
}

export { handler as GET, handler as POST };

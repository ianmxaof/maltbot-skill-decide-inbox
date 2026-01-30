/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Next.js dev client uses eval(); strict CSP in external browsers blocks it.
  // Allow it in dev so the app works in external browsers (Cursor's in-app browser may not enforce CSP).
  async headers() {
    return process.env.NODE_ENV === "development"
      ? [
          {
            source: "/:path*",
            headers: [
              {
                key: "Content-Security-Policy",
                value: [
                  "default-src 'self'",
                  "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
                  "style-src 'self' 'unsafe-inline'",
                  "img-src 'self' data: blob:",
                  "connect-src 'self' ws: wss:",
                  "font-src 'self'",
                ].join("; "),
              },
            ],
          },
        ]
      : [];
  },
};

module.exports = nextConfig;

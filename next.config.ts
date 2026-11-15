import type { NextConfig } from "next";
import { execFileSync } from 'node:child_process';

function revision() {
  const supplied = process.env.VERCEL_GIT_COMMIT_SHA || process.env.GITHUB_SHA;
  if (supplied) return supplied.slice(0, 7);
  try { return execFileSync('git', ['rev-parse', '--short=7', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); }
  catch { return 'local'; }
}

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_APP_REVISION: revision() },
  outputFileTracingRoot: process.cwd(),
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};

export default nextConfig;

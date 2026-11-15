import type { NextConfig } from "next";
import { execFileSync } from 'node:child_process';
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants';

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

export default function config(phase: string): NextConfig {
  // Next 15 shares .next between dev and build by default. Keep their manifests
  // separate so a production build cannot invalidate a running development server.
  return { ...nextConfig, distDir: phase === PHASE_DEVELOPMENT_SERVER ? '.next-dev' : '.next' };
}

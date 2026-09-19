import type { NextConfig } from "next";

// Extract the Supabase hostname from the environment; the wildcard pattern below is the fallback.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let dynamicHostname: string | null = null;
if (supabaseUrl) {
  try {
    dynamicHostname = new URL(supabaseUrl).hostname;
  } catch {
    // fall back to the wildcard pattern
  }
}

const nextConfig: NextConfig = {
  output: process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  reactCompiler: true,
  images: {
    remotePatterns: [
      ...(dynamicHostname
        ? [{
            protocol: 'https' as const,
            hostname: dynamicHostname,
            pathname: '/storage/v1/object/public/**',
          }]
        : []),
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;

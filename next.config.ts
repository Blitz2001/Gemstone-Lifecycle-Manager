import type { NextConfig } from "next";

// Dynamically extract Supabase hostname from environment variable or fallback to wildcard
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let dynamicHostname = 'qxxtlytyjkwqyumlxvvv.supabase.co';
if (supabaseUrl) {
  try {
    dynamicHostname = new URL(supabaseUrl).hostname;
  } catch {
    // fallback
  }
}

const nextConfig: NextConfig = {
  output: process.env.OUTPUT_STANDALONE === 'true' ? 'standalone' : undefined,
  reactCompiler: true,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: dynamicHostname,
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;

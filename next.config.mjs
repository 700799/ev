/** @type {import('next').NextConfig} */

// For GitHub Pages project sites the app is served from /<repo>.
// Set NEXT_PUBLIC_BASE_PATH="/ev" in CI (the deploy workflow does this).
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'export',
  basePath,
  assetPrefix: basePath || undefined,
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;

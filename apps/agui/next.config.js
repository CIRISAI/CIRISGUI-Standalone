/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  // Skip OAuth routes during static export (only needed in managed mode)
  // In standalone mode, users log in with local credentials
  skipTrailingSlashRedirect: true,
};

module.exports = nextConfig;

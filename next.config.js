/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['react-leaflet', 'leaflet'],
  reactStrictMode: false,
};

module.exports = nextConfig;
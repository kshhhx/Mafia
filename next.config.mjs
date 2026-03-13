/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Turned off to avoid double-render issues with real-time sockets in dev
};

export default nextConfig;

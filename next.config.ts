import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  reloadOnOnline: true,
  swcMinify: true,
  workboxOptions: {
    disableDevLogs: true,
    exclude: [
        /middleware-manifest\.json$/,
        /_next\/static\/.*\.js$/,
        /\.map$/
    ],
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);
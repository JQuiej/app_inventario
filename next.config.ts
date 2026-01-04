import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  // 1. DESACTIVAR caché agresiva (Esto es lo que causa el bucle con el login)
  cacheOnFrontEndNav: false,
  aggressiveFrontEndNavCaching: false,
  
  // 2. Opciones estándar
  reloadOnOnline: true,
  swcMinify: true,
  
  // 3. Configuración de Workbox para evitar conflictos
  workboxOptions: {
    disableDevLogs: true,
    // Ignoramos rutas que no deben cachearse
    exclude: [
        /middleware-manifest\.json$/, 
        /_next\/static\/.*\.js$/, // Evita cachear scripts de dev que cambian mucho
        /\.map$/
    ],
  },
});

const nextConfig: NextConfig = {};

export default withPWA(nextConfig);


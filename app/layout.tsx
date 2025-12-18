import type { Metadata, Viewport } from "next";
import NextTopLoader from 'nextjs-toploader'; // <--- IMPORTAR
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from 'sonner';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Inventario",
  description: "Sistema de gestión de inventario",
  manifest: "/manifest.json", // <-- Importante para PWA
};

// Configuración visual para móviles (PWA)
export const viewport: Viewport = {
  themeColor: "#0f172a", // El color de la barra de estado en el cel
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false, // Evita que hagan zoom a los botones por error
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
      
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Agrega esto al principio del body */}
        <NextTopLoader 
          color="#2299DD" // Color de tu marca (puedes poner el azul de tu dashboard)
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false} // false para que solo sea la barra, true para barra + circulito
          easing="ease"
          speed={200}
          shadow="0 0 10px #2299DD,0 0 5px #2299DD"
        />
        {children}
        
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
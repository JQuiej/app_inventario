import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Mastercell Inventario',
    short_name: 'Mastercell',
    description: 'Sistema de control de inventario y reparaciones',
    start_url: '/login',
    display: 'standalone',
    background_color: '#0f172a',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/icon.png', // Usará el mismo icono que pusiste en app/
        sizes: 'any',
        type: 'image/png',
      },
    ],
  }
}
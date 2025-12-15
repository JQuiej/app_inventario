import { type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Ignorar explícitamente rutas internas de Next.js, imágenes, 
     * iconos, el manifiesto y el service worker (sw.js)
     */
    '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|workbox-.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
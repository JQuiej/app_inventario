import { type NextRequest } from 'next/server'
import { updateSession } from './utils/supabase/middleware' // Asumiendo que usas la config estándar de Supabase SSR

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    '/dashboard/:path*', // Protege todo lo que esté bajo /dashboard
  ],
}
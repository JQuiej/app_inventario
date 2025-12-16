import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  // 1. REGLA DE ORO: Ignorar assets estáticos
  if (
    request.nextUrl.pathname.includes('manifest.webmanifest') || 
    request.nextUrl.pathname.includes('icon.png') ||
    request.nextUrl.pathname.includes('sw.js')
  ) {
    return NextResponse.next()
  }

  // 2. Configuración normal de Supabase
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // 3. Lógica de Protección y Redirección por ROL
  
  // Si intenta entrar al dashboard sin usuario -> Login
  if (request.nextUrl.pathname.startsWith('/dashboard') && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Si entra al raíz '/' (Home)
  if (request.nextUrl.pathname === '/') {
    if (user) {
      // Consultamos el ROL para redirigir inteligentemente
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      // Si es técnico -> Reparaciones
      if (profile?.role === 'tecnico') {
         return NextResponse.redirect(new URL('/dashboard/reparaciones', request.url))
      }

      // Si es admin u otro -> Dashboard General
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  }

  return response
}
'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  
  // 1. Intentar iniciar sesión
  const { data: authData, error } = await supabase.auth.signInWithPassword(data)
  if (error) redirect('/login?error=true')
  
  // 2. Verificar el ROL del usuario antes de redirigir
  if (authData.user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .single()

    // Si es técnico, lo mandamos directo a reparaciones
    if (profile?.role === 'tecnico') {
      revalidatePath('/', 'layout')
      redirect('/dashboard/reparaciones')
    }
  }
  
  // 3. Si no es técnico (es Admin/Dueño), va al Dashboard general
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const businessName = formData.get('business_name') as string

  if (!businessName) {
    // Podrías manejar errores más específicos aquí
    redirect('/login?error=missing_business_name')
  }

  // Enviamos el nombre del negocio en "data" (user_metadata)
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        business_name: businessName 
      }
    }
  })

  if (error) redirect('/login?error=signup_failed')
  
  // Redirigimos con mensaje de éxito
  redirect('/login?message=check_email')
}

export async function logout() {
  const supabase = await createClient()
  
  // 1. Cerrar sesión en Supabase (esto borra la cookie)
  await supabase.auth.signOut()
  
  // 2. Revalidar toda la aplicación para limpiar cachés
  revalidatePath('/', 'layout')
  
  // 3. Redirigir al login
  redirect('/login')
}
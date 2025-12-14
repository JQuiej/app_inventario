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
  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) redirect('/login?error=true')
  
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
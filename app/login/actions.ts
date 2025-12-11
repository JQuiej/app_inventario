'use server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '../../utils/supabase/server' // Ajusta a tu path de cliente

export async function login(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { error } = await (await supabase).auth.signInWithPassword(data)
  if (error) {
    redirect('/login?error=true')
  }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const supabase = createClient()
  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }
  const { error } = await (await supabase).auth.signUp(data)
  if (error) {
    redirect('/login?error=signup_failed')
  }
  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function crearCategoria(formData: FormData) {
  const supabase = await createClient()

  // 1. Verificar autenticación (Seguridad)
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    // Si no hay usuario, redirigir a login
    redirect('/login')
  }

  // 2. Obtener datos del formulario
  const nombre = formData.get('nombre') as string

  if (!nombre) {
    return { error: 'El nombre es requerido' }
  }

  // 3. Insertar en la base de datos
  const { error } = await supabase.from('categorias').insert({
    nombre: nombre,
    usuario_id: user.id // Importante: vinculamos la categoría al usuario actual
  })

  if (error) {
    console.error('Error creando categoría:', error)
    return { error: 'Error al crear la categoría' }
  }

  // 4. Actualizar la vista (Revalidar)
  // Esto hace que la lista de categorías se refresque automáticamente sin recargar la página
  revalidatePath('/dashboard/categorias')
}
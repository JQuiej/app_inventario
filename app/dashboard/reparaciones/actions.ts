'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- HELPER: OBTENER EL ID REAL (Del usuario o de su jefe) ---
async function getTargetUserId(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Consultamos si este usuario tiene un jefe (owner_id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('owner_id')
    .eq('id', user.id)
    .single()

  // Si tiene jefe (es técnico), retornamos el ID del jefe. Si no, su propio ID.
  return profile?.owner_id || user.id
}

// 1. Obtener reparaciones (CORREGIDO)
export async function getReparaciones() {
  const supabase = await createClient()
  const targetId = await getTargetUserId(supabase) // <--- Usamos el ID objetivo
  if (!targetId) return []

  const { data, error } = await supabase
    .from('reparaciones')
    .select('*')
    .eq('usuario_id', targetId) // <--- Filtramos por el ID objetivo
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  return data || []
}

// 2. Crear nueva reparación (CORREGIDO)
export async function crearReparacion(formData: FormData) {
  const supabase = await createClient()
  const targetId = await getTargetUserId(supabase) // <--- Usamos el ID objetivo
  if (!targetId) return

  const data = {
    usuario_id: targetId, // <--- Guardamos a nombre del Jefe
    cliente_nombre: formData.get('cliente_nombre'),
    cliente_telefono: formData.get('cliente_telefono'),
    dispositivo: formData.get('dispositivo'),
    falla: formData.get('falla'),
    observaciones: formData.get('observaciones'),
    cotizacion: parseFloat(formData.get('cotizacion') as string) || 0,
    categoria: formData.get('categoria'),
    precio: parseFloat(formData.get('precio') as string) || 0,
    comision: parseFloat(formData.get('comision') as string) || 0,
    estado: 'Pendiente'
  }

  await supabase.from('reparaciones').insert(data)
  revalidatePath('/dashboard/reparaciones')
}

// 3. Actualizar Estado
export async function actualizarEstado(id: string, nuevoEstado: string, notaExtra: string) {
  const supabase = await createClient()
  
  const { data: actual } = await supabase.from('reparaciones').select('observaciones').eq('id', id).single()
  
  let obsFinal = actual?.observaciones || ''
  if (notaExtra) {
    const fecha = new Date().toLocaleDateString()
    obsFinal += `\n[${fecha} - ${nuevoEstado}]: ${notaExtra}`
  }

  await supabase.from('reparaciones').update({
    estado: nuevoEstado,
    observaciones: obsFinal
  }).eq('id', id)

  revalidatePath('/dashboard/reparaciones')
}

// 4. Eliminar Reparación
export async function eliminarReparacion(id: string) {
  const supabase = await createClient()
  await supabase.from('reparaciones').delete().eq('id', id)
  revalidatePath('/dashboard/reparaciones')
}

// 5. Editar información completa (INCLUYE PRECIO Y COMISIÓN)
export async function editarReparacion(formData: FormData) {
    const supabase = await createClient()
    const id = formData.get('id') as string
    
    const updates = {
        cliente_nombre: formData.get('cliente_nombre'),
        cliente_telefono: formData.get('cliente_telefono'),
        dispositivo: formData.get('dispositivo'),
        falla: formData.get('falla'),
        observaciones: formData.get('observaciones'),
        cotizacion: parseFloat(formData.get('cotizacion') as string) || 0,
        // Actualizamos los nuevos campos financieros y categoría
        categoria: formData.get('categoria'),
        precio: parseFloat(formData.get('precio') as string) || 0,
        comision: parseFloat(formData.get('comision') as string) || 0,
    }

    await supabase.from('reparaciones').update(updates).eq('id', id)
    revalidatePath('/dashboard/reparaciones')
}
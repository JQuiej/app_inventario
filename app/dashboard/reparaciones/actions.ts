'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- HELPER: OBTENER EL ID REAL (Del usuario o de su jefe) ---
async function getTargetUserId(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('owner_id')
    .eq('id', user.id)
    .single()

  return profile?.owner_id || user.id
}

// 1. Obtener reparaciones
export async function getReparaciones() {
  const supabase = await createClient()
  const targetId = await getTargetUserId(supabase)
  if (!targetId) return []

  const { data, error } = await supabase
    .from('reparaciones')
    .select('*')
    .eq('usuario_id', targetId)
    .order('created_at', { ascending: false })

  if (error) console.error(error)
  return data || []
}

// 2. Crear nueva reparación
export async function crearReparacion(formData: FormData) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: profile } = await supabase.from('profiles').select('owner_id').eq('id', user.id).single()
  const targetId = profile?.owner_id || user.id

  const fechaForm = formData.get('fecha_recepcion') as string
  const fechaRecepcion = fechaForm ? new Date(fechaForm).toISOString() : new Date().toISOString()

  const data = {
    usuario_id: targetId,
    cliente_nombre: formData.get('cliente_nombre'),
    cliente_telefono: formData.get('cliente_telefono'),
    dispositivo: formData.get('dispositivo'),
    falla: formData.get('falla'),
    observaciones: formData.get('observaciones'),
    categoria: formData.get('categoria'),
    
    // DINERO
    cotizacion: parseFloat(formData.get('cotizacion') as string) || 0,
    precio: parseFloat(formData.get('precio') as string) || 0,
    comision: parseFloat(formData.get('comision') as string) || 0,
    adelanto: parseFloat(formData.get('adelanto') as string) || 0,
    
    // ESTADOS
    estado: 'Pendiente',
    estado_pago: 'Pendiente', // <--- NUEVO CAMPO POR DEFECTO
    fecha_recepcion: fechaRecepcion,
    ultimo_cambio_estado: new Date().toISOString()
  }

  await supabase.from('reparaciones').insert(data)
  revalidatePath('/dashboard/reparaciones')
}

// 3. Actualizar Estado (Reparación)
export async function actualizarEstado(id: string, nuevoEstado: string, notaExtra: string, fechaDispositivo: string) {
  const supabase = await createClient()
  
  const { data: actual } = await supabase.from('reparaciones').select('observaciones').eq('id', id).single()
  let obsFinal = actual?.observaciones || ''
  
  if (notaExtra) {
    const fechaTexto = new Date(fechaDispositivo).toLocaleDateString('es-GT')
    obsFinal += `\n[${fechaTexto} - ${nuevoEstado}]: ${notaExtra}`
  }

  await supabase.from('reparaciones').update({ 
    estado: nuevoEstado, 
    observaciones: obsFinal,
    ultimo_cambio_estado: fechaDispositivo
  }).eq('id', id)
  
  revalidatePath('/dashboard/reparaciones')
}

// 4. Eliminar Reparación
export async function eliminarReparacion(id: string) {
  const supabase = await createClient()
  await supabase.from('reparaciones').delete().eq('id', id)
  revalidatePath('/dashboard/reparaciones')
}

// 5. Editar información completa (INCLUYE ESTADO DE PAGO)
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
        categoria: formData.get('categoria'),
        precio: parseFloat(formData.get('precio') as string) || 0,
        comision: parseFloat(formData.get('comision') as string) || 0,
        adelanto: parseFloat(formData.get('adelanto') as string) || 0,
        
        // ACTUALIZAR ESTADO DE PAGO
        estado_pago: formData.get('estado_pago') // <--- CAPTURAMOS EL NUEVO ESTADO
    }

    await supabase.from('reparaciones').update(updates).eq('id', id)
    revalidatePath('/dashboard/reparaciones')
}
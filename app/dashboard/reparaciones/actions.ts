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
  
  // Aquí usamos la lógica de usuario/dueño que hicimos antes
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // Buscamos el ID correcto (Dueño o Técnico)
  const { data: profile } = await supabase.from('profiles').select('owner_id').eq('id', user.id).single()
  const targetId = profile?.owner_id || user.id

  // Obtenemos la fecha del formulario o usamos la actual
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
    precio: parseFloat(formData.get('precio') as string) || 0,     // Precio Final estimado
    comision: parseFloat(formData.get('comision') as string) || 0, // Mano de obra
    adelanto: parseFloat(formData.get('adelanto') as string) || 0, // <--- NUEVO CAMPO
    
    // FECHAS Y ESTADO
    estado: 'Pendiente',
    fecha_recepcion: fechaRecepcion,          // <--- NUEVO CAMPO
    ultimo_cambio_estado: new Date().toISOString() // <--- NUEVO CAMPO (Inicia hoy)
  }

  await supabase.from('reparaciones').insert(data)
  revalidatePath('/dashboard/reparaciones')
}

export async function actualizarEstado(id: string, nuevoEstado: string, notaExtra: string, fechaDispositivo: string) {
  const supabase = await createClient()
  
  // Obtenemos info actual para no perder las notas viejas
  const { data: actual } = await supabase.from('reparaciones').select('observaciones').eq('id', id).single()
  let obsFinal = actual?.observaciones || ''
  
  if (notaExtra) {
    // Usamos la fecha del dispositivo para que coincida en el historial de texto
    // 'es-GT' asegura formato día/mes/año
    const fechaTexto = new Date(fechaDispositivo).toLocaleDateString('es-GT')
    obsFinal += `\n[${fechaTexto} - ${nuevoEstado}]: ${notaExtra}`
  }

  // Actualizamos estado y la FECHA DE CAMBIO usando la hora que envió el dispositivo
  await supabase.from('reparaciones').update({ 
    estado: nuevoEstado, 
    observaciones: obsFinal,
    ultimo_cambio_estado: fechaDispositivo  // <--- GUARDA LA HORA EXACTA DE TU CELULAR/PC
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
        adelanto: parseFloat(formData.get('adelanto') as string) || 0,
    }

    await supabase.from('reparaciones').update(updates).eq('id', id)
    revalidatePath('/dashboard/reparaciones')
}
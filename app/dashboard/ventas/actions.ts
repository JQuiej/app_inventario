'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// 1. Obtener productos (Stock > 0)
export async function getProductosParaVenta() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .gt('stock_actual', 0)
    .order('nombre')
  
  if (error) return []
  return data
}

// 2. Obtener historial filtrado
export async function getHistorialFiltrado(fechaInicio: string, fechaFin: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select('*, productos(nombre)') 
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', fechaInicio)
    .lte('creado_en', fechaFin)
    .order('creado_en', { ascending: false })

  if (error) {
    console.error('Error historial:', error)
    return []
  }
  return data
}

// 3. CREAR VENTA (Corregido para recibir Objeto, no FormData)
type VentaData = {
  producto_id: string
  cantidad: number
  precio_venta: number
}

export async function crearVenta(data: VentaData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Usuario no autenticado")

  // Insertamos usando los datos directos del objeto
  const { error } = await supabase.from('movimientos_inventario').insert({
    usuario_id: user.id,
    producto_id: data.producto_id,
    tipo_movimiento: 'SALIDA',
    cantidad: data.cantidad,
    precio_real_venta: data.precio_venta,
    notas: 'Venta mostrador'
  })

  if (error) {
    console.error("Error al crear venta:", error)
    throw new Error("No se pudo registrar la venta")
  }

  // Actualizamos las rutas afectadas
  revalidatePath('/dashboard/ventas')
  revalidatePath('/dashboard/inventario') // Importante para actualizar stock visualmente
}
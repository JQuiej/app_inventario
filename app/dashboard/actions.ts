'use server'
import { createClient } from '@/utils/supabase/server'

// 1. Obtener Estadísticas de HOY (CORREGIDO)
export async function getStatsDiarios() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Retorno seguro si no hay usuario
  if (!user) return { ventasHoy: 0, gananciaHoy: 0, totalProductos: 0 }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const { data: movimientos } = await supabase
    .from('movimientos_inventario')
    .select('cantidad, precio_real_venta, productos(costo_promedio)')
    .eq('usuario_id', user.id) // <--- FILTRO
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', todayStart.toISOString())
    .lte('creado_en', todayEnd.toISOString())

  let ventasHoy = 0
  let gananciaHoy = 0

  movimientos?.forEach((m: any) => {
    const venta = m.cantidad * m.precio_real_venta
    const costo = (m.productos?.costo_promedio || 0) * m.cantidad
    ventasHoy += venta
    gananciaHoy += (venta - costo)
  })

  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', user.id) //

  return {
    ventasHoy,
    gananciaHoy,
    totalProductos: totalProductos || 0
  }
}

// 2. Obtener Productos con Stock Bajo (CORREGIDO)
export async function getStockBajo() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, sku')
    .eq('usuario_id', user.id)
    .eq('activo', true) // <--- FILTRO AGREGADO: Solo productos activos
    .lt('stock_actual', 4)
    .order('stock_actual', { ascending: true })

  return data || []
}

// 3. Datos para la Gráfica (CORREGIDO)
export async function getChartData() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const date = new Date()
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  
  const { data } = await supabase
    .from('movimientos_inventario')
    .select('creado_en, cantidad, precio_real_venta')
    .eq('usuario_id', user.id) // <--- FILTRO
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', firstDay.toISOString())
    .order('creado_en')

  const groupedData: Record<string, number> = {}

  data?.forEach(m => {
    const dia = new Date(m.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    const total = m.cantidad * m.precio_real_venta
    if (groupedData[dia]) {
      groupedData[dia] += total
    } else {
      groupedData[dia] = total
    }
  })

  return Object.keys(groupedData).map(key => ({
    name: key,
    total: groupedData[key]
  }))
}
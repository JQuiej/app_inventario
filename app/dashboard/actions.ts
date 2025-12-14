'use server'
import { createClient } from '@/utils/supabase/server'

// 1. Obtener Estadísticas de HOY (Ventas y Ganancia estimada)
export async function getStatsDiarios() {
  const supabase = await createClient()
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // Traemos ventas de HOY y el producto asociado para saber su costo
  const { data: movimientos } = await supabase
    .from('movimientos_inventario')
    .select('cantidad, precio_real_venta, productos(costo_promedio)')
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', todayStart.toISOString())
    .lte('creado_en', todayEnd.toISOString())

  let ventasHoy = 0
  let gananciaHoy = 0

  movimientos?.forEach((m: any) => {
    const venta = m.cantidad * m.precio_real_venta
    // Ganancia = Venta - (Costo * Cantidad)
    const costo = (m.productos?.costo_promedio || 0) * m.cantidad
    ventasHoy += venta
    gananciaHoy += (venta - costo)
  })

  // Contar productos totales
  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })

  return {
    ventasHoy,
    gananciaHoy,
    totalProductos: totalProductos || 0
  }
}

// 2. Obtener Productos con Stock Bajo (Menos de 5 unidades)
export async function getStockBajo() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual, sku')
    .lt('stock_actual', 5) // <--- UMBRAL DE STOCK BAJO
    .order('stock_actual', { ascending: true })
    .limit(5) // Solo mostramos los 5 más urgentes

  return data || []
}

// 3. Datos para la Gráfica (Ventas agrupadas por día del mes actual)
export async function getChartData() {
  const supabase = await createClient()
  const date = new Date()
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1)
  
  const { data } = await supabase
    .from('movimientos_inventario')
    .select('creado_en, cantidad, precio_real_venta')
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', firstDay.toISOString())
    .order('creado_en')

  // Agrupamos los datos en JS (Supabase no tiene group_by directo sin RPC)
  // Esto es rápido porque solo traemos las ventas del mes, no de todo el año
  const groupedData: Record<string, number> = {}

  data?.forEach(m => {
    // Formato fecha corta: "14/12"
    const dia = new Date(m.creado_en).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    const total = m.cantidad * m.precio_real_venta
    
    if (groupedData[dia]) {
      groupedData[dia] += total
    } else {
      groupedData[dia] = total
    }
  })

  // Convertir a array para Recharts
  return Object.keys(groupedData).map(key => ({
    name: key,
    total: groupedData[key]
  }))
}
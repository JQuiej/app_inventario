'use server'
import { createClient } from '@/utils/supabase/server'

export async function getStatsData(month: number, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const emptyStats = { 
    reparaciones: [], ventas: [], 
    daily: { ventas: [], reparaciones: [], total: [] }, 
    financials: {
      ventas: { ingresos: 0, costos: 0, ganancia: 0 },
      reparaciones: { ingresos: 0, costos: 0, ganancia: 0 },
      total: { ingresos: 0, costos: 0, ganancia: 0 }
    }
  }

  if (!user) return emptyStats

  // --- FECHAS ---
  const startDate = new Date(year, month - 1, 1, 0, 0, 0).toISOString()
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).toISOString()

  // Generar mapa de días (1 al 30/31)
  const daysInMonth = new Date(year, month, 0).getDate()
  const baseDailyMap = new Map<number, number>()
  for (let i = 1; i <= daysInMonth; i++) {
    baseDailyMap.set(i, 0)
  }

  const dailyVentas = new Map(baseDailyMap)
  const dailyReparaciones = new Map(baseDailyMap)
  const dailyTotal = new Map(baseDailyMap)

  // ==========================================
  // 1. REPARACIONES (POR FECHA DE PAGO/CAMBIO)
  // ==========================================
  const { data: repData } = await supabase
    .from('reparaciones')
    .select('precio, cotizacion, comision, categoria, ultimo_cambio_estado') // <--- CAMBIO AQUÍ
    .eq('usuario_id', user.id)
    .eq('estado_pago', 'Pagado') // <--- FILTRO: Solo lo efectivamente cobrado
    .gte('ultimo_cambio_estado', startDate) // <--- FILTRO FECHA: Cuándo se cobró
    .lte('ultimo_cambio_estado', endDate)

  const repMap = new Map<string, number>()
  let repIngresos = 0
  let repCostos = 0

  repData?.forEach((item: any) => {
    const ingreso = Number(item.precio) || 0
    const costoBase = Number(item.cotizacion) || 0
    const comision = Number(item.comision) || 0
    const costoTotal = costoBase + comision
    const cat = item.categoria || 'Otras'

    if (ingreso > 0) {
      // Agrupar por Categoría
      repMap.set(cat, (repMap.get(cat) || 0) + ingreso)
      
      // Agrupar por Día (Usando ultimo_cambio_estado)
      // Nota: Si es null (datos viejos), usamos la fecha actual por seguridad, o lo saltamos.
      const fechaReferencia = item.ultimo_cambio_estado || new Date().toISOString()
      const day = new Date(fechaReferencia).getDate()
      
      dailyReparaciones.set(day, (dailyReparaciones.get(day) || 0) + ingreso)
      dailyTotal.set(day, (dailyTotal.get(day) || 0) + ingreso)

      repIngresos += ingreso
      repCostos += costoTotal
    }
  })

  // ==========================================
  // 2. VENTAS (PRODUCTOS)
  // ==========================================
  const { data: ventasData } = await supabase
    .from('movimientos_inventario')
    .select(`
      cantidad, precio_real_venta, costo_unitario, creado_en,
      productos ( costo_promedio, categorias ( nombre ) )
    `)
    .eq('usuario_id', user.id)
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', startDate)
    .lte('creado_en', endDate)

  const ventasMap = new Map<string, number>()
  let venIngresos = 0
  let venCostos = 0

  ventasData?.forEach((item: any) => {
    const prod = item.productos || {}
    const catNombre = prod.categorias?.nombre || 'Ventas'
    const qty = Number(item.cantidad) || 0
    const precioVenta = Number(item.precio_real_venta) || 0
    const costoUnit = item.costo_unitario ?? (Number(prod.costo_promedio) || 0)

    const ventaTotal = qty * precioVenta
    const costoTotal = qty * costoUnit

    ventasMap.set(catNombre, (ventasMap.get(catNombre) || 0) + ventaTotal)

    const day = new Date(item.creado_en).getDate()
    dailyVentas.set(day, (dailyVentas.get(day) || 0) + ventaTotal)
    dailyTotal.set(day, (dailyTotal.get(day) || 0) + ventaTotal)
    
    venIngresos += ventaTotal
    venCostos += costoTotal
  })

  // ==========================================
  // 3. RETORNO DE DATOS
  // ==========================================
  const formatDaily = (map: Map<number, number>) => {
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, total]) => ({ name: day.toString(), total }))
  }

  return {
    reparaciones: Array.from(repMap.entries()).map(([name, total]) => ({ name, total })),
    ventas: Array.from(ventasMap.entries()).map(([name, total]) => ({ name, total })),
    
    daily: {
      ventas: formatDaily(dailyVentas),
      reparaciones: formatDaily(dailyReparaciones),
      total: formatDaily(dailyTotal)
    },

    financials: {
      ventas: { ingresos: venIngresos, costos: venCostos, ganancia: venIngresos - venCostos },
      reparaciones: { ingresos: repIngresos, costos: repCostos, ganancia: repIngresos - repCostos },
      total: { ingresos: venIngresos + repIngresos, costos: venCostos + repCostos, ganancia: (venIngresos + repIngresos) - (venCostos + repCostos) }
    }
  }
}
'use server'
import { createClient } from '@/utils/supabase/server'

export async function getStatsData(month: number, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const emptyStats = { 
    reparaciones: [], ventas: [], 
    daily: { ventas: [], reparaciones: [], total: [] }, 
    topProducts: [], // <--- NUEVO CAMPO
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

  // Generar mapa de días
  const daysInMonth = new Date(year, month, 0).getDate()
  const baseDailyMap = new Map<number, number>()
  for (let i = 1; i <= daysInMonth; i++) {
    baseDailyMap.set(i, 0)
  }

  const dailyVentas = new Map(baseDailyMap)
  const dailyReparaciones = new Map(baseDailyMap)
  const dailyTotal = new Map(baseDailyMap)

  // ==========================================
  // 1. REPARACIONES
  // ==========================================
  const { data: repData } = await supabase
    .from('reparaciones')
    .select('precio, cotizacion, comision, categoria, ultimo_cambio_estado')
    .eq('usuario_id', user.id)
    .eq('estado_pago', 'Pagado')
    .gte('ultimo_cambio_estado', startDate)
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
      repMap.set(cat, (repMap.get(cat) || 0) + ingreso)
      
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
      productos ( nombre, costo_promedio, categorias ( nombre ) ) 
    `) // <--- AHORA TRAEMOS EL NOMBRE DEL PRODUCTO
    .eq('usuario_id', user.id)
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', startDate)
    .lte('creado_en', endDate)

  const ventasMap = new Map<string, number>()
  const productStats = new Map<string, { name: string, category: string, quantity: number, total: number }>() // <--- MAPA PARA TOP PRODUCTOS
  
  let venIngresos = 0
  let venCostos = 0

  ventasData?.forEach((item: any) => {
    const prod = item.productos || {}
    const catNombre = prod.categorias?.nombre || 'Ventas'
    const prodNombre = prod.nombre || 'Producto desconocido' // <--- NOMBRE PRODUCTO
    const qty = Number(item.cantidad) || 0
    const precioVenta = Number(item.precio_real_venta) || 0
    const costoUnit = item.costo_unitario ?? (Number(prod.costo_promedio) || 0)

    const ventaTotal = qty * precioVenta
    const costoTotal = qty * costoUnit

    // Agrupación por Categoría General
    ventasMap.set(catNombre, (ventasMap.get(catNombre) || 0) + ventaTotal)

    // Agrupación Diaria
    const day = new Date(item.creado_en).getDate()
    dailyVentas.set(day, (dailyVentas.get(day) || 0) + ventaTotal)
    dailyTotal.set(day, (dailyTotal.get(day) || 0) + ventaTotal)
    
    // Agrupación por Producto (Para el TOP 5)
    const currentProd = productStats.get(prodNombre) || { name: prodNombre, category: catNombre, quantity: 0, total: 0 }
    productStats.set(prodNombre, {
        ...currentProd,
        quantity: currentProd.quantity + qty,
        total: currentProd.total + ventaTotal
    })

    venIngresos += ventaTotal
    venCostos += costoTotal
  })

  const formatDaily = (map: Map<number, number>) => {
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([day, total]) => ({ name: day.toString(), total }))
  }

  // Ordenar productos por cantidad vendida (mayor a menor)
  const topProductsList = Array.from(productStats.values())
    .sort((a, b) => b.quantity - a.quantity)

  return {
    reparaciones: Array.from(repMap.entries()).map(([name, total]) => ({ name, total })),
    ventas: Array.from(ventasMap.entries()).map(([name, total]) => ({ name, total })),
    
    daily: {
      ventas: formatDaily(dailyVentas),
      reparaciones: formatDaily(dailyReparaciones),
      total: formatDaily(dailyTotal)
    },

    topProducts: topProductsList, // <--- RETORNAMOS LA LISTA

    financials: {
      ventas: { ingresos: venIngresos, costos: venCostos, ganancia: venIngresos - venCostos },
      reparaciones: { ingresos: repIngresos, costos: repCostos, ganancia: repIngresos - repCostos },
      total: { ingresos: venIngresos + repIngresos, costos: venCostos + repCostos, ganancia: (venIngresos + repIngresos) - (venCostos + repCostos) }
    }
  }
}
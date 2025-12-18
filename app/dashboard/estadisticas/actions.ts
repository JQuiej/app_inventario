'use server'
import { createClient } from '@/utils/supabase/server'

export async function getStatsData(month: number, year: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // Estructura inicial vacía
  const emptyStats = { 
    reparaciones: [], ventas: [], 
    financials: {
      ventas: { ingresos: 0, costos: 0, ganancia: 0 },
      reparaciones: { ingresos: 0, costos: 0, ganancia: 0 },
      total: { ingresos: 0, costos: 0, ganancia: 0 }
    }
  }

  if (!user) return emptyStats

  // RANGO DE FECHAS (Timezone friendly)
  const startDate = new Date(year, month - 1, 1, 0, 0, 0).toISOString()
  const endDate = new Date(year, month, 1, 23, 59, 59).toISOString()

  // ==========================================
  // 1. REPARACIONES (FILTRADO DESDE LA DB)
  // ==========================================
  const { data: repData } = await supabase
    .from('reparaciones')
    .select('precio, cotizacion, comision, categoria')
    .eq('usuario_id', user.id)
    // --- FILTRO CLAVE: Solo traemos lo que ya generó dinero real o finalizó ---
    .in('estado_pago', ['Pagado']) 
    .gte('created_at', startDate)
    .lt('created_at', endDate)

  const repMap = new Map<string, number>()
  let repIngresos = 0
  let repCostos = 0

  repData?.forEach((item: any) => {
    const ingreso = Number(item.precio) || 0
    
    // Costo Real = Cotización (Repuesto) + Comisión (Mano de obra externa)
    const costoBase = Number(item.cotizacion) || 0
    const comision = Number(item.comision) || 0
    const costoTotal = costoBase + comision

    const cat = item.categoria || 'Otras Reparaciones'

    // Aseguramos que solo sume si tiene precio mayor a 0
    if (ingreso > 0) {
      repMap.set(cat, (repMap.get(cat) || 0) + ingreso)
      
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
      cantidad,
      precio_real_venta,
      costo_unitario,
      productos (
        costo_promedio,
        categorias ( nombre )
      )
    `)
    .eq('usuario_id', user.id)
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', startDate)
    .lt('creado_en', endDate)

  const ventasMap = new Map<string, number>()
  let venIngresos = 0
  let venCostos = 0

  ventasData?.forEach((item: any) => {
    const prod = item.productos || {}
    const catData: any = prod.categorias
    const catNombre = catData?.nombre || 'Ventas Generales'

    const qty = Number(item.cantidad) || 0
    const precioVenta = Number(item.precio_real_venta) || 0
    
    // Costo: Si se guardó al vender úsalo, sino usa el promedio actual
    const costoUnit = item.costo_unitario !== null 
      ? Number(item.costo_unitario) 
      : (Number(prod.costo_promedio) || 0)

    const ventaTotal = qty * precioVenta
    const costoTotal = qty * costoUnit

    ventasMap.set(catNombre, (ventasMap.get(catNombre) || 0) + ventaTotal)
    
    venIngresos += ventaTotal
    venCostos += costoTotal
  })

  // ==========================================
  // 3. RETORNO ESTRUCTURADO
  // ==========================================
  
  // Ordenar gráficas
  const statsReparaciones = Array.from(repMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  const statsVentas = Array.from(ventasMap.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)

  return {
    reparaciones: statsReparaciones,
    ventas: statsVentas,
    financials: {
      ventas: {
        ingresos: venIngresos,
        costos: venCostos,
        ganancia: venIngresos - venCostos
      },
      reparaciones: {
        ingresos: repIngresos,
        costos: repCostos,
        ganancia: repIngresos - repCostos
      },
      total: {
        ingresos: venIngresos + repIngresos,
        costos: venCostos + repCostos,
        ganancia: (venIngresos + repIngresos) - (venCostos + repCostos)
      }
    }
  }
}
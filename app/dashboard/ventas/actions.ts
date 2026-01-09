'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- NUEVA FUNCIÓN: OBTENER CATEGORÍAS ---
export async function getCategorias() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('usuario_id', user.id)
    .order('nombre', { ascending: true })
    
  return data || []
}

// --- VERIFICAR SI UN PRODUCTO TIENE REEMBOLSO (TAM) ACTIVO ---
export async function getReembolsoActivo(productoId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return 0

  const hoy = new Date().toISOString()

  // Buscamos en la tabla de relación si hay una promoción activa para hoy
  const { data } = await supabase
    .from('promocion_productos')
    .select(`
      monto_descuento,
      promocion_id!inner (
        activo,
        fecha_inicio,
        fecha_fin,
        usuario_id
      )
    `)
    .eq('producto_id', productoId)
    .eq('promocion_id.usuario_id', user.id)
    .eq('promocion_id.activo', true)
    .lte('promocion_id.fecha_inicio', hoy) // Que haya empezado
    .gte('promocion_id.fecha_fin', hoy)    // Que no haya terminado
    .maybeSingle()

  // Si encontramos algo, devolvemos el monto, si no, 0
  return data ? Number(data.monto_descuento) : 0
}

// 1. Obtener productos (Stock > 0)
export async function getProductosParaVenta() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('usuario_id', user.id)
    .gt('stock_actual', 0)
    .order('nombre')
  
  if (error) return []
  return data
}

// 2. Obtener historial filtrado (MODIFICADO PARA CATEGORÍA)
export async function getHistorialFiltrado(fechaInicio: string, fechaFin: string, categoriaId: string = '') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  // Usamos productos!inner para poder filtrar por la categoría del producto relacionado
  let query = supabase
    .from('movimientos_inventario')
    .select('*, productos!inner(id, nombre, categoria_id)') 
    .eq('usuario_id', user.id)
    .eq('tipo_movimiento', 'SALIDA')
    .gte('creado_en', fechaInicio)
    .lte('creado_en', fechaFin)
    .order('creado_en', { ascending: false })

  // APLICAR FILTRO SI EXISTE
  if (categoriaId && categoriaId !== 'todas') {
    query = query.eq('productos.categoria_id', categoriaId)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error historial:', error)
    return []
  }
  return data
}

export async function eliminarVenta(id: string) {
  const supabase = await createClient()
  
  // 1. Obtener datos de la venta antes de borrar
  const { data: venta } = await supabase
    .from('movimientos_inventario')
    .select('producto_id, cantidad')
    .eq('id', id)
    .single()

  if (!venta) return { error: 'Venta no encontrada' }

  // 2. Devolver stock al producto
  const { data: producto } = await supabase
    .from('productos')
    .select('stock_actual')
    .eq('id', venta.producto_id)
    .single()

  if (producto) {
    await supabase.from('productos')
      .update({ stock_actual: producto.stock_actual + venta.cantidad })
      .eq('id', venta.producto_id)
  }

  // 3. Borrar el registro
  const { error } = await supabase.from('movimientos_inventario').delete().eq('id', id)

  if (error) return { error: error.message }
  revalidatePath('/dashboard/ventas')
  revalidatePath('/dashboard/inventario')
  return { success: true }
}

// 4. ACTUALIZAR VENTA
export async function actualizarVenta(id: string, nuevaCantidad: number, nuevoPrecio: number) {
  const supabase = await createClient()

  // 1. Obtener venta original
  const { data: ventaOriginal } = await supabase
    .from('movimientos_inventario')
    .select('producto_id, cantidad')
    .eq('id', id)
    .single()

  if (!ventaOriginal) return

  // 2. Calcular diferencia de stock
  const diferencia = ventaOriginal.cantidad - nuevaCantidad

  if (diferencia !== 0) {
    const { data: producto } = await supabase
      .from('productos')
      .select('stock_actual')
      .eq('id', ventaOriginal.producto_id)
      .single()

    if (producto) {
      // Validar que haya stock si estamos aumentando la venta
      if (diferencia < 0 && (producto.stock_actual + diferencia) < 0) {
        throw new Error("No hay suficiente stock para aumentar la venta")
      }

      await supabase.from('productos')
        .update({ stock_actual: producto.stock_actual + diferencia })
        .eq('id', ventaOriginal.producto_id)
    }
  }

  // 3. Actualizar la venta
  await supabase.from('movimientos_inventario').update({
    cantidad: nuevaCantidad,
    precio_real_venta: nuevoPrecio
  }).eq('id', id)

  revalidatePath('/dashboard/ventas')
  revalidatePath('/dashboard/inventario')
}

type VentaData = {
  producto_id: string
  cantidad: number
  precio_venta: number
}

export async function crearVenta(data: VentaData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Usuario no autenticado")

  // 1. OBTENER DATOS PRODUCTO
  const { data: producto, error: prodError } = await supabase
    .from('productos')
    .select('costo_promedio, stock_actual')
    .eq('id', data.producto_id)
    .single()

  if (prodError || !producto) throw new Error("Producto no encontrado")

  // 2. INSERTAR LA VENTA
  const { data: ventaInsertada, error } = await supabase
    .from('movimientos_inventario')
    .insert({
      usuario_id: user.id,
      producto_id: data.producto_id,
      tipo_movimiento: 'SALIDA',
      cantidad: data.cantidad,
      precio_real_venta: data.precio_venta,
      costo_unitario: producto.costo_promedio,
      notas: 'Venta mostrador'
    })
    .select()
    .single()

  if (error) throw new Error("No se pudo registrar la venta")

  // =================================================================================
  // 3. LÓGICA TAM (INTACTA)
  // =================================================================================
  const hoy = new Date().toISOString()
  
  // Buscamos si este producto pertenece a alguna campaña activa del usuario
  const { data: relacionPromocion } = await supabase
    .from('promocion_productos')
    .select(`
      monto_descuento,
      promocion_id,
      promocion_id (
        id, fecha_inicio, fecha_fin, activo, usuario_id
      )
    `)
    .eq('producto_id', data.producto_id)
    .eq('promocion_id.usuario_id', user.id)
    .eq('promocion_id.activo', true)
    .lte('promocion_id.fecha_inicio', hoy)
    .gte('promocion_id.fecha_fin', hoy)
    .maybeSingle()

  if (relacionPromocion && relacionPromocion.promocion_id) {
    const promo = relacionPromocion.promocion_id
    
    // USAMOS EL MONTO ESPECÍFICO DEL PRODUCTO
    const descuentoUnitario = Number(relacionPromocion.monto_descuento) 
    const montoTotalReembolso = descuentoUnitario * data.cantidad

    if (montoTotalReembolso > 0) {
        await supabase.from('tam').insert({
          venta_id: ventaInsertada.id,
          promocion_id: promo.id,
          monto_pendiente: montoTotalReembolso,
          estado: 'Registrado'
        })
    }
  }
  // =================================================================================

  revalidatePath('/dashboard/ventas')
  revalidatePath('/dashboard/inventario')
  revalidatePath('/dashboard/reembolsos')
}
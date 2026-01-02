'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// --- 1. OBTENER CAMPAÑAS CON BALANCE (CORREGIDO) ---
export async function getCampanasConBalance() {
  const supabase = await createClient()
  
  // 1. Obtener usuario autenticado
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 2. Obtener campañas
  // CORRECCIÓN: Nombre de tabla 'promocion_productos' y columna 'monto_descuento'
  const { data: campanas, error } = await supabase
    .from('promociones_proveedor')
    .select(`
      *,
      categorias (nombre),
      promocion_productos (
        monto_descuento,
        productos (
          id,
          nombre
        )
      )
    `)
    .eq('usuario_id', user.id) // <--- Debe coincidir con tu columna 'usuario_id'
    .order('created_at', { ascending: false })

  if (error) {
    console.error("Error al cargar campañas:", error)
    return []
  }

  if (!campanas || campanas.length === 0) return []

  // 3. Calcular balances
  const balancePromises = campanas.map(async (c) => {
      // Mapear la estructura anidada para que el frontend la entienda mejor (opcional pero recomendado)
      // El frontend espera 'promociones_productos' con 'descuento', pero la DB trae 'promocion_productos' con 'monto_descuento'
      // Haremos un pequeño ajuste manual aquí o en el frontend. 
      // Para no romper tu frontend actual, dejaremos que viaje como 'promocion_productos'.

      const { data: recordsTam } = await supabase
        .from('tam')
        .select('monto_pendiente')
        .eq('promocion_id', c.id)
      
      const totalGenerado = recordsTam?.reduce((sum, item) => sum + Number(item.monto_pendiente), 0) || 0

      const { data: recordsPagos } = await supabase
        .from('pagos_tam')
        .select('monto_pagado')
        .eq('promocion_id', c.id)
      
      const totalPagado = recordsPagos?.reduce((sum, item) => sum + Number(item.monto_pagado), 0) || 0

      return {
          ...c,
          // Normalizamos el nombre para el frontend si es necesario, si no, el frontend debe leer c.promocion_productos
          promociones_productos: c.promocion_productos?.map((p: any) => ({
             descuento: p.monto_descuento, // Mapeamos monto_descuento a descuento
             productos: p.productos
          })), 
          total_generado: totalGenerado,
          total_pagado: totalPagado,
          saldo_pendiente: totalGenerado - totalPagado
      }
  })

  return Promise.all(balancePromises)
}

// --- 2. ELIMINAR CAMPAÑA (CORREGIDO Y EN ORDEN) ---
export async function eliminarCampana(id: string) {
  const supabase = await createClient()

  // PASO 1: Eliminar historial de pagos asociados (Tabla 'pagos_tam')
  const { error: errorPagos } = await supabase
    .from('pagos_tam') 
    .delete()
    .eq('promocion_id', id)

  if (errorPagos) {
    console.error('Error borrando pagos:', errorPagos)
    throw new Error('No se pudo eliminar el historial de pagos de la campaña')
  }

  // PASO 2: Eliminar registros de ventas/reembolsos (Tabla 'tam')
  const { error: errorTam } = await supabase
    .from('tam') 
    .delete()
    .eq('promocion_id', id)

  if (errorTam) {
    console.error('Error borrando registros TAM:', errorTam)
    throw new Error('No se pudieron eliminar los registros de ventas asociados')
  }

  // PASO 3: Eliminar la configuración de productos (Tabla 'promocion_productos')
  const { error: errorConfig } = await supabase
    .from('promocion_productos') 
    .delete()
    .eq('promocion_id', id)

  if (errorConfig) {
    console.error('Error borrando config productos:', errorConfig)
    throw new Error('No se pudo limpiar la configuración de productos')
  }

  // PASO 4: Finalmente, eliminar la campaña principal (Tabla 'promociones_proveedor')
  const { error } = await supabase
    .from('promociones_proveedor')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error eliminando campaña:', error)
    throw new Error('No se pudo eliminar la campaña principal. Verifique dependencias.')
  }

  revalidatePath('/tam') 
}

// --- 3. ACTUALIZAR CAMPAÑA (CORREGIDO Y SEGURO) ---
export async function actualizarCampana(
  id: string, 
  formData: FormData, 
  productos: { id: string, monto: number }[]
) {
  const supabase = await createClient()
  
  const nombre = formData.get('nombre') as string
  const fecha_inicio = formData.get('fecha_inicio') as string
  const fecha_fin = formData.get('fecha_fin') as string
  const categoria_id = formData.get('categoria_id') as string

  // Construimos el objeto de actualización dinámicamente
  const updateData: any = {
      nombre,
      fecha_inicio,
      fecha_fin
  }

  // LÓGICA DE PROTECCIÓN:
  // Solo agregamos categoria_id al update si realmente viene un valor.
  // Si el frontend lo mandó null (o estaba disabled), NO lo tocamos en la BD.
  if (categoria_id && categoria_id.trim() !== '') {
      updateData.categoria_id = categoria_id
  }

  // 1. Actualizar datos base
  const { error: errorUpdate } = await supabase
    .from('promociones_proveedor')
    .update(updateData) // <--- Usamos el objeto protegido
    .eq('id', id)

  if (errorUpdate) throw new Error('Error al actualizar datos de campaña')

  // 2. Actualizar productos (Igual que antes...)
  // A) Borrar anteriores
  const { error: errorDelete } = await supabase
    .from('promocion_productos') // Recuerda usar el nombre correcto de tu tabla
    .delete()
    .eq('promocion_id', id)

  if (errorDelete) throw new Error('Error limpiando productos antiguos')

  // B) Insertar nuevos
  if (productos.length > 0) {
    const records = productos.map(p => ({
      promocion_id: id,
      producto_id: p.id,
      monto_descuento: p.monto 
    }))

    const { error: errorInsert } = await supabase
      .from('promocion_productos')
      .insert(records)

    if (errorInsert) {
      console.error(errorInsert)
      throw new Error('Error al insertar nuevos productos')
    }
  }

  revalidatePath('/reembolsos')
}

// --- 4. CREAR CAMPAÑA ---
type ProductoSeleccionado = {
    id: string
    monto: number
}

export async function crearCampana(formData: FormData, productos: ProductoSeleccionado[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("No autorizado")

  const dataCampana = {
    usuario_id: user.id,
    nombre: formData.get('nombre'),
    categoria_id: formData.get('categoria_id'),
    monto_reembolso: 0, 
    fecha_inicio: formData.get('fecha_inicio'),
    fecha_fin: formData.get('fecha_fin'),
  }

  const { data: newCampana, error } = await supabase
    .from('promociones_proveedor')
    .insert(dataCampana)
    .select()
    .single()

  if (error) throw new Error(error.message)

  if (productos.length > 0) {
      const relaciones = productos.map(p => ({
          promocion_id: newCampana.id,
          producto_id: p.id,
          monto_descuento: p.monto 
      }))
      // CORRECCIÓN: Tabla 'promocion_productos'
      await supabase.from('promocion_productos').insert(relaciones)
  }

  revalidatePath('/dashboard/reembolsos')
}

// --- 5. OBTENER HISTORIAL (CORREGIDO RELACIONES) ---
export async function getHistorialCampana(campanaId: string) {
    const supabase = await createClient()

    // A. Obtener Ventas (TAM)
    const { data: ventas } = await supabase
        .from('tam')
        .select(`
            id, created_at, monto_pendiente, estado,
            movimientos_inventario (
                productos (nombre)
            )
        `)
        .eq('promocion_id', campanaId)
        .order('created_at', { ascending: false })

    // B. Obtener Pagos
    const { data: pagos } = await supabase
        .from('pagos_tam')
        .select('*')
        .eq('promocion_id', campanaId)
        .order('fecha_pago', { ascending: false }) // CORRECCIÓN: ordenar por fecha_pago o created_at

    return { 
        ventas: ventas || [], 
        pagos: pagos || [] 
    }
}

// --- 6. REEMBOLSOS PENDIENTES (CORREGIDO NOMBRE COLUMNA) ---
export async function getReembolsosPendientes() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('tam') 
    .select(`
      *,
      promociones_proveedor ( nombre ),
      movimientos_inventario ( 
        creado_en, 
        cantidad,
        productos ( nombre )
      )
    `) // CORRECCIÓN: 'creado_en' en lugar de 'created_at' para movimientos
    .order('created_at', { ascending: false })
    
  return data || []
}

// --- UTILS ---
export async function registrarPagoProveedor(promocionId: string, monto: number, notas: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    await supabase.from('pagos_tam').insert({
        usuario_id: user?.id,
        promocion_id: promocionId,
        monto_pagado: monto,
        notas: notas
    })
    revalidatePath('/dashboard/reembolsos')
}

export async function marcarComoPagado(id: string) {
    const supabase = await createClient()
    await supabase.from('tam').update({
        estado: 'Pagado',
    }).eq('id', id)
    revalidatePath('/dashboard/reembolsos')
}

export async function getProductosDeCategoria(categoriaId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('productos')
        .select('id, nombre, sku')
        .eq('categoria_id', categoriaId)
        .eq('usuario_id', user.id)
        .order('nombre')
    
    return data || []
}

export async function getCategorias() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []
    const { data } = await supabase.from('categorias').select('*').eq('usuario_id', user.id)
    return data || []
}
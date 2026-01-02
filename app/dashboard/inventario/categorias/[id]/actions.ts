'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function agregarStockAction(productoId: string, cantidad: number, costo: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('movimientos_inventario').insert({
    usuario_id: user.id,
    producto_id: productoId,
    tipo_movimiento: 'ENTRADA',
    cantidad: cantidad,
    costo_unitario: costo
  })
}

export async function crearProductoCompleto(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const categoriaId = formData.get('categoria_id') as string
  const stockInicial = parseInt(formData.get('stock_inicial') as string) || 0
  const costoUnitario = parseFloat(formData.get('costo_unitario') as string) || 0

  const { data: producto, error } = await supabase.from('productos').insert({
    usuario_id: user.id,
    categoria_id: categoriaId,
    nombre: formData.get('nombre'),
    sku: formData.get('sku'),
    precio_venta: parseFloat(formData.get('precio_venta') as string),
    stock_actual: 0
  }).select().single()

  if (error || !producto) {
    console.error(error)
    return
  }

  if (stockInicial > 0) {
    await supabase.from('movimientos_inventario').insert({
      usuario_id: user.id,
      producto_id: producto.id,
      tipo_movimiento: 'ENTRADA',
      cantidad: stockInicial,
      costo_unitario: costoUnitario,
      notas: 'Stock Inicial con descuento aplicado'
    })
  }
  
  revalidatePath(`/dashboard/categorias/${categoriaId}`)
}

export async function eliminarProducto(productoId: string, categoriaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('productos').delete().eq('id', productoId)
  
  revalidatePath(`/dashboard/inventario/${categoriaId}`)
}

export async function editarProducto(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const productoId = formData.get('producto_id') as string
  const categoriaId = formData.get('categoria_id') as string
  
  const updates = {
    nombre: formData.get('nombre'),
    sku: formData.get('sku'),
    precio_venta: parseFloat(formData.get('precio_venta') as string),
    costo_promedio: parseFloat(formData.get('costo_promedio') as string), // <--- AGREGADO
  }

  await supabase.from('productos').update(updates).eq('id', productoId)
  
  revalidatePath(`/dashboard/inventario/categorias/${categoriaId}`)
}

export async function toggleEstadoProducto(id: string, estadoActual: boolean) {
    const supabase = await createClient()
    
    const { error } = await supabase
        .from('productos')
        .update({ activo: !estadoActual }) // Invierte el valor actual
        .eq('id', id)

    if (error) throw new Error('Error al actualizar estado del producto')
    
    // Revalidamos todas las rutas posibles donde aparezca el inventario
    revalidatePath('/dashboard/inventario')
    revalidatePath('/dashboard/ventas') 
}

/**
 * Obtiene los productos de una categoría específica.
 * @param mostrarInactivos Si es true, trae todo. Si es false, solo trae los activos.
 */
export async function getProductosPorCategoria(categoriaId: string, mostrarInactivos: boolean = false) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    let query = supabase
        .from('productos')
        .select('*')
        .eq('categoria_id', categoriaId)
        .eq('usuario_id', user.id)
        .order('nombre', { ascending: true })

    // Filtro lógico: Si NO queremos ver inactivos, filtramos activo = true
    // Si mostrarInactivos es true, no aplicamos filtro (trae true y false)
    if (!mostrarInactivos) {
        query = query.eq('activo', true)
    }

    const { data } = await query
    return data || []
}
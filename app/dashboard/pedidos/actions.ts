'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getCategorias() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('categorias')
        .select('id, nombre')
        .eq('usuario_id', user.id)
        .order('nombre')

    return data || []
}

export async function getProductosPorCategoria(categoriaId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('productos')
        .select('id, nombre, sku, precio_venta, stock_actual, costo_promedio')
        .eq('categoria_id', categoriaId)
        .eq('usuario_id', user.id)
        .order('nombre')

    return data || []
}

export async function getPedidos() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data } = await supabase
        .from('pedidos')
        .select(`
            *,
            categorias (nombre),
            pedido_items (
                id, producto_id, cantidad, costo_base, descuento_porcentaje, costo_unitario_final, subtotal,
                productos (nombre, sku)
            )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })

    return data || []
}

export async function crearProductoEnPedido(datos: {
    categoriaId: string
    nombre: string
    sku: string
    precio_venta: number
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const { data, error } = await supabase
        .from('productos')
        .insert({
            usuario_id: user.id,
            categoria_id: datos.categoriaId,
            nombre: datos.nombre.trim(),
            sku: datos.sku.trim() || null,
            precio_venta: datos.precio_venta,
            stock_actual: 0,
        })
        .select('id, nombre, sku, precio_venta, stock_actual, costo_promedio')
        .single()

    if (error) return { error: 'Error al crear el producto' }
    return { data }
}

export async function crearPedido(pedidoData: {
    categoria_id: string
    proveedor: string
    items: Array<{
        producto_id: string
        cantidad: number
        costo_base: number
        descuento_porcentaje: number
        costo_unitario_final: number
        subtotal: number
    }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    const total_inversion = pedidoData.items.reduce((sum, i) => sum + i.subtotal, 0)

    // 1. Crear el pedido
    const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert({
            usuario_id: user.id,
            categoria_id: pedidoData.categoria_id,
            proveedor: pedidoData.proveedor.trim() || null,
            total_inversion,
        })
        .select('id')
        .single()

    if (pedidoError || !pedido) return { error: 'Error al registrar el pedido' }

    // 2. Por cada ítem: insertar en pedido_items + registrar ENTRADA en inventario
    for (const item of pedidoData.items) {
        await supabase.from('pedido_items').insert({
            pedido_id: pedido.id,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            costo_base: item.costo_base,
            descuento_porcentaje: item.descuento_porcentaje,
            costo_unitario_final: item.costo_unitario_final,
            subtotal: item.subtotal,
        })

        await supabase.from('movimientos_inventario').insert({
            usuario_id: user.id,
            producto_id: item.producto_id,
            tipo_movimiento: 'ENTRADA',
            cantidad: item.cantidad,
            costo_unitario: item.costo_unitario_final,
            notas: pedidoData.proveedor
                ? `Pedido - Proveedor: ${pedidoData.proveedor}`
                : 'Pedido de compra',
        })
    }

    revalidatePath('/dashboard/pedidos')
    revalidatePath('/dashboard/inventario/categorias')
    return { success: true }
}

export async function eliminarPedido(pedidoId: string) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    // Verificar que el pedido pertenece al usuario y traer sus ítems
    const { data: pedido } = await supabase
        .from('pedidos')
        .select('id, pedido_items(producto_id, cantidad)')
        .eq('id', pedidoId)
        .eq('usuario_id', user.id)
        .single()

    if (!pedido) return { error: 'Pedido no encontrado' }

    // Revertir stock: restar la cantidad que se había sumado al inventario
    for (const item of (pedido.pedido_items as any[] || [])) {
        const { data: prod } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', item.producto_id)
            .single()

        if (prod) {
            await supabase
                .from('productos')
                .update({ stock_actual: Math.max(0, prod.stock_actual - item.cantidad) })
                .eq('id', item.producto_id)
        }
    }

    // Eliminar pedido (los ítems se eliminan en cascada)
    await supabase.from('pedidos').delete().eq('id', pedidoId).eq('usuario_id', user.id)

    revalidatePath('/dashboard/pedidos')
    revalidatePath('/dashboard/inventario/categorias')
    return { success: true }
}

export async function editarPedido(pedidoId: string, datos: {
    proveedor: string
    items: Array<{
        producto_id: string
        nombre: string
        cantidad: number
        costo_base: number
        descuento_porcentaje: number
        costo_unitario_final: number
        subtotal: number
    }>
}) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'No autenticado' }

    // Traer ítems originales para revertir su stock
    const { data: pedido } = await supabase
        .from('pedidos')
        .select('id, categoria_id, pedido_items(producto_id, cantidad)')
        .eq('id', pedidoId)
        .eq('usuario_id', user.id)
        .single()

    if (!pedido) return { error: 'Pedido no encontrado' }

    // 1. Revertir stock de todos los ítems originales
    for (const old of (pedido.pedido_items as any[] || [])) {
        const { data: prod } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', old.producto_id)
            .single()

        if (prod) {
            await supabase
                .from('productos')
                .update({ stock_actual: Math.max(0, prod.stock_actual - old.cantidad) })
                .eq('id', old.producto_id)
        }
    }

    // 2. Borrar ítems existentes
    await supabase.from('pedido_items').delete().eq('pedido_id', pedidoId)

    // 3. Insertar nuevos ítems y sumar stock
    const total_inversion = datos.items.reduce((sum, i) => sum + i.subtotal, 0)

    for (const item of datos.items) {
        await supabase.from('pedido_items').insert({
            pedido_id: pedidoId,
            producto_id: item.producto_id,
            cantidad: item.cantidad,
            costo_base: item.costo_base,
            descuento_porcentaje: item.descuento_porcentaje,
            costo_unitario_final: item.costo_unitario_final,
            subtotal: item.subtotal,
        })

        const { data: prod } = await supabase
            .from('productos')
            .select('stock_actual')
            .eq('id', item.producto_id)
            .single()

        if (prod) {
            await supabase
                .from('productos')
                .update({ stock_actual: prod.stock_actual + item.cantidad })
                .eq('id', item.producto_id)
        }
    }

    // 4. Actualizar datos del pedido
    await supabase
        .from('pedidos')
        .update({ proveedor: datos.proveedor.trim() || null, total_inversion })
        .eq('id', pedidoId)
        .eq('usuario_id', user.id)

    revalidatePath('/dashboard/pedidos')
    revalidatePath('/dashboard/inventario/categorias')
    return { success: true }
}

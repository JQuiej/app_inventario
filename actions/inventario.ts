'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Configuración auxiliar para servidor
const getSupabase = async () => {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
           try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch {}
        },
      },
    }
  )
}

// 1. Obtener Categorías
export async function getCategorias() {
  const supabase = await getSupabase()
  const { data } = await supabase.from('categorias').select('*').order('nombre')
  return data
}

// 2. Obtener Productos por Categoría
export async function getProductosPorCategoria(categoriaId: string) {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from('productos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .order('nombre')
  return data
}

// 3. AGREGAR STOCK (IMPORTANTE: Usamos la tabla de movimientos)
export async function agregarStock(productoId: string, cantidad: number, costoUnitario: number) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  // Insertamos en movimientos, el Trigger de SQL actualizará el stock y el costo promedio solo
  const { error } = await supabase.from('movimientos_inventario').insert({
    usuario_id: user.id,
    producto_id: productoId,
    tipo_movimiento: 'ENTRADA',
    cantidad: cantidad,
    costo_unitario: costoUnitario
  })

  if (error) console.error(error)
  return { success: !error }
}

// 4. Estadísticas (Dashboard)
export async function getEstadisticas() {
  const supabase = await getSupabase()
  
  // Total Productos
  const { count: totalProductos } = await supabase.from('productos').select('*', { count: 'exact', head: true })
  
  // Total Ventas (Suma de salidas)
  // Nota: Esto es mejor hacerlo con una RPC en Supabase, pero aquí lo haremos simple filtrando
  const { data: ventas } = await supabase
    .from('movimientos_inventario')
    .select('cantidad, precio_real_venta')
    .eq('tipo_movimiento', 'SALIDA')

  const totalVendido = ventas?.reduce((acc, curr) => acc + (curr.cantidad * (curr.precio_real_venta || 0)), 0) || 0

  return { totalProductos, totalVendido }
}
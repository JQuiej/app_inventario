'use server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'

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

// 1. Obtener Categorías (CORREGIDO: Exclusivo del usuario)
export async function getCategorias() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('usuario_id', user.id) // Filtro de seguridad
    .order('nombre')
    
  return data
}

// CORREGIDO: Ahora verifica que la categoría pertenezca al usuario antes de dar el nombre
export async function getCategoriaNombre(categoriaId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return "Desconocido"

  const { data, error } = await supabase
    .from('categorias')
    .select('nombre')
    .eq('id', categoriaId)
    .eq('usuario_id', user.id) // Agregamos este filtro
    .single()

  if (error || !data) return "Categoría no encontrada"
  return data.nombre
}

// 2. Obtener Productos por Categoría (CORREGIDO: Exclusivo del usuario)
export async function getProductosPorCategoria(categoriaId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .eq('usuario_id', user.id) // Filtro de seguridad
    .order('nombre', { ascending: true })

  if (error) {
    console.error('ERROR SQL:', error)
    return []
  }

  return data
}

// 3. AGREGAR STOCK (Correcto, inserta con ID de usuario)
export async function agregarStock(productoId: string, cantidad: number, costoUnitario: number) {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

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

// 4. Estadísticas (CORREGIDO: Ahora solo cuenta datos del usuario)
export async function getEstadisticas() {
  const supabase = await getSupabase()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return { totalProductos: 0, totalVendido: 0 }
  
  // Total Productos (Solo del usuario)
  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', user.id) // Filtro agregado
  
  // Total Ventas (Solo del usuario)
  const { data: ventas } = await supabase
    .from('movimientos_inventario')
    .select('cantidad, precio_real_venta')
    .eq('usuario_id', user.id) // Filtro agregado
    .eq('tipo_movimiento', 'SALIDA')

  const totalVendido = ventas?.reduce((acc, curr) => acc + (curr.cantidad * (curr.precio_real_venta || 0)), 0) || 0

  return { totalProductos: totalProductos || 0, totalVendido }
}
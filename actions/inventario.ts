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

// 1. Obtener Categorías (CORREGIDO)
export async function getCategorias() {
  const supabase = await createClient() // Usamos createClient directo para consistencia
  
  // 1. Verificar usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 2. Filtrar por usuario_id
  const { data } = await supabase
    .from('categorias')
    .select('*')
    .eq('usuario_id', user.id) // <--- ESTA LÍNEA ES CLAVE
    .order('nombre')
    
  return data
}

export async function getCategoriaNombre(categoriaId: string) {
  const supabase = await createClient()
  // No es estrictamente necesario filtrar por usuario aquí si solo es el nombre, 
  // pero es buena práctica para no revelar nombres de categorías ajenas.
  const { data, error } = await supabase
    .from('categorias')
    .select('nombre')
    .eq('id', categoriaId)
    .single()

  if (error || !data) return "Categoría"
  return data.nombre
}

// 2. Obtener Productos por Categoría (CORREGIDO)
export async function getProductosPorCategoria(categoriaId: string) {
  const supabase = await createClient()
  
  // 1. Verificar usuario
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  // 2. Consulta filtrada
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('categoria_id', categoriaId)
    .eq('usuario_id', user.id) // <--- ESTA LÍNEA EVITA VER DATOS DE OTROS
    .order('nombre', { ascending: true })

  if (error) {
    console.error('ERROR SQL:', error)
    return []
  }

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
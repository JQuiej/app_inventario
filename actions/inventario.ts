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

// 1. Obtener Categorías
export async function getCategorias() {
  const supabase = await getSupabase()
  const { data } = await supabase.from('categorias').select('*').order('nombre')
  return data
}

// Agrega esto al final de actions/inventario.ts

export async function getCategoriaNombre(categoriaId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('categorias')
    .select('nombre')
    .eq('id', categoriaId)
    .single()

  if (error || !data) return "Categoría Desconocida"
  return data.nombre
}

// 2. Obtener Productos por Categoría
export async function getProductosPorCategoria(categoriaId: string) {
  // 1. Logs iniciales para ver qué llega al servidor
  console.log("--- DEBUG SERVER ---")
  console.log("Buscando productos para categoría:", categoriaId)

  const supabase = await createClient()
  
  // 2. Verificamos si hay usuario (solo informativo por ahora)
  const { data: { user } } = await supabase.auth.getUser()
  console.log("Usuario autenticado:", user?.id || "NO HAY USUARIO")

  // 3. LA CONSULTA (Modificada para DEBUG)
  // Comentamos el filtro de usuario para ver SI EXISTEN los productos
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .eq('categoria_id', categoriaId)
    // .eq('usuario_id', user?.id)  <-- COMENTADO TEMPORALMENTE PARA PROBAR
    .order('nombre', { ascending: true })

  if (error) {
    console.error('ERROR SQL:', error)
    return []
  }

  console.log(`Encontrados ${data?.length} productos en la DB`)
  console.log("Datos:", data)
  console.log("--------------------")

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
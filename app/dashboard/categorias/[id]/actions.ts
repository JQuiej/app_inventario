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

export async function agregarProductoNuevo(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('productos').insert({
    usuario_id: user.id,
    categoria_id: formData.get('categoria_id'),
    nombre: formData.get('nombre'),
    precio_venta: parseFloat(formData.get('precio_venta') as string),
    stock_actual: 0 // Inicia en 0
  })
  
  revalidatePath('/dashboard/categorias/[id]')
}
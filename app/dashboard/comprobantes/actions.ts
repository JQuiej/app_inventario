'use server'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function getConfiguracionNegocio() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('configuracion_negocio')
    .select('*')
    .eq('usuario_id', user.id)
    .maybeSingle() // Usamos maybeSingle para evitar errores si está vacío
  
  if (error) console.error("Error obteniendo config:", error)
  
  return data
}

// --- GUARDAR CONFIGURACIÓN ---
export async function guardarConfiguracion(formData: FormData) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        console.error("Usuario no autenticado al guardar configuración");
        return;
    }

    const logoFile = formData.get('logo') as File;
    let logoUrl = null;

    // 1. PROCESAR IMAGEN (Solo si se subió una nueva)
    if (logoFile && logoFile.size > 0) {
        try {
            const fileExt = logoFile.name.split('.').pop();
            const fileName = `logo-${user.id}-${Date.now()}.${fileExt}`;
            
            const arrayBuffer = await logoFile.arrayBuffer()
            const fileBuffer = Buffer.from(arrayBuffer)

            const { error: uploadError } = await supabase.storage
                .from('negocio-logos')
                .upload(fileName, fileBuffer, {
                    contentType: logoFile.type || 'image/png',
                    upsert: true
                });

            if (uploadError) {
                console.error('Error subiendo logo a Storage:', uploadError);
                // No detenemos el proceso, guardamos los textos aunque falle el logo
            } else {
                const { data: { publicUrl } } = supabase.storage
                    .from('negocio-logos')
                    .getPublicUrl(fileName);
                logoUrl = publicUrl;
            }
        } catch (err) {
            console.error("Excepción procesando imagen:", err);
        }
    }

    // 2. PREPARAR DATOS (Asegurando strings limpios)
    const datos: any = {
        usuario_id: user.id,
        nombre_negocio: formData.get('nombre_negocio')?.toString() || '',
        direccion: formData.get('direccion')?.toString() || '',
        telefono: formData.get('telefono')?.toString() || '',
        mensaje_garantia: formData.get('mensaje_garantia')?.toString() || '',
    }
    
    // Solo añadimos logo_url si hay una nueva imagen.
    // Si no, no lo tocamos para no borrar la existente.
    if (logoUrl) {
        datos.logo_url = logoUrl;
    }

    // 3. ACTUALIZAR O INSERTAR (Lógica corregida)
    // Verificamos si ya existe configuración para este usuario
    const { data: existente, error: fetchError } = await supabase
        .from('configuracion_negocio')
        .select('id')
        .eq('usuario_id', user.id)
        .maybeSingle(); // maybeSingle retorna null en lugar de error si no existe

    if (fetchError) {
        console.error("Error verificando existencia:", fetchError);
        return;
    }

    let errorOperacion;

    if (existente) {
        // ACTUALIZAR
        const { error } = await supabase
            .from('configuracion_negocio')
            .update(datos)
            .eq('id', existente.id);
        errorOperacion = error;
    } else {
        // INSERTAR NUEVO
        const { error } = await supabase
            .from('configuracion_negocio')
            .insert(datos);
        errorOperacion = error;
    }

    if (errorOperacion) {
        console.error("Error al guardar en base de datos:", errorOperacion);
    } else {
        // Solo revalidamos si todo salió bien
        revalidatePath('/dashboard/comprobantes');
    }
}

// --- CREAR VENTA (SOLO DISPOSITIVOS + ACTIVACIÓN) ---
export async function crearVentaComprobante(ventaData: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' }

  const { data: prod } = await supabase.from('productos').select('*').eq('id', ventaData.producto_id).single()
  if (!prod || prod.stock_actual < 1) return { error: 'Stock insuficiente' }

  // 1. Insertar Movimiento
  const { data: movimiento, error: movError } = await supabase
    .from('movimientos_inventario')
    .insert({
      usuario_id: user.id,
      producto_id: ventaData.producto_id,
      tipo_movimiento: 'SALIDA',
      cantidad: 1, 
      precio_real_venta: ventaData.precio, // Precio TOTAL cobrado
      costo_unitario: prod.costo_promedio,
      notas: 'Venta Dispositivo'
    })
    .select()
    .single()

  if (movError) return { error: 'Error al registrar venta' }

  // 2. Descontar Stock
  await supabase.from('productos').update({ stock_actual: prod.stock_actual - 1 }).eq('id', prod.id)

  // 3. Guardar Comprobante con Datos de Activación
  await supabase.from('ventas_comprobantes').insert({
    movimiento_id: movimiento.id,
    usuario_id: user.id,
    cliente_nombre: ventaData.cliente_nombre,
    cliente_dpi: ventaData.cliente_dpi,
    cliente_telefono: ventaData.cliente_telefono, // Teléfono de contacto del cliente
    imei_dispositivo: ventaData.imei,
    icc: ventaData.icc,
    // CAMPOS NUEVOS DE ACTIVACIÓN
    telefono_activacion: ventaData.telefono_activacion || null,
    monto_activacion: ventaData.monto_activacion || 0
  }).select().single()

  // 4. Lógica TAM (Reembolsos)
  const hoy = new Date().toISOString()
  const { data: relacionPromocion } = await supabase
    .from('promocion_productos')
    .select(`monto_descuento, promocion_id, promocion_id!inner(id, activo, fecha_inicio, fecha_fin, usuario_id)`)
    .eq('producto_id', ventaData.producto_id)
    .eq('promocion_id.usuario_id', user.id)
    .eq('promocion_id.activo', true)
    .lte('promocion_id.fecha_inicio', hoy)
    .gte('promocion_id.fecha_fin', hoy)
    .maybeSingle()

  if (relacionPromocion) {
      const descuento = Number(relacionPromocion.monto_descuento)
      if (descuento > 0) {
          await supabase.from('tam').insert({
              venta_id: movimiento.id,
              promocion_id: relacionPromocion.promocion_id.id,
              monto_pendiente: descuento,
              estado: 'Registrado',
              notas: 'Generado desde Comprobantes'
          })
      }
  }

  revalidatePath('/dashboard/comprobantes')
  return { success: true }
}

// app/dashboard/comprobantes/actions.ts

// ... (tus imports y funciones anteriores siguen igual)

export async function getHistorialComprobantes() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if(!user) return []

    const { data, error } = await supabase
        .from('ventas_comprobantes')
        .select(`
            *,
            movimientos_inventario (
                creado_en,          
                precio_real_venta,
                productos ( 
                    nombre,
                    precio_venta  
                ),
            
                tam (
                    monto_pendiente 
                )
            )
        `) 
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false })

    if (error) {
        console.error("Error fetching historial:", error)
        return []
    }

    return data || []
}

// --- ELIMINAR ---
export async function eliminarVentaComprobante(id: string) {
    const supabase = await createClient()
    const { data: comp } = await supabase.from('ventas_comprobantes').select('movimiento_id').eq('id', id).single()
    if(comp) {
        const { data: mov } = await supabase.from('movimientos_inventario').select('producto_id').eq('id', comp.movimiento_id).single()
        if(mov) {
            const { data: prod } = await supabase.from('productos').select('stock_actual').eq('id', mov.producto_id).single()
            if(prod) await supabase.from('productos').update({ stock_actual: prod.stock_actual + 1 }).eq('id', mov.producto_id)
        }
        await supabase.from('movimientos_inventario').delete().eq('id', comp.movimiento_id)
    }
    revalidatePath('/dashboard/comprobantes')
}

export async function getHistorialFiltrado(filtro: string, fecha?: string, page: number = 1, limit: number = 10) {
  const supabase = await createClient();
  
  // Calcular rango de fechas
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  // Ajustar zona horaria (opcional según tu config)
  
  switch (filtro) {
    case 'hoy':
        startDate.setHours(0,0,0,0);
        endDate.setHours(23,59,59,999);
        break;
    case 'ayer':
        startDate.setDate(now.getDate() - 1);
        startDate.setHours(0,0,0,0);
        endDate.setDate(now.getDate() - 1);
        endDate.setHours(23,59,59,999);
        break;
    case '7dias':
        startDate.setDate(now.getDate() - 7);
        break;
    case 'mes_actual':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    case 'por_mes':
        if (fecha) {
            // fecha viene como '2024-02'
            const [year, month] = fecha.split('-').map(Number);
            startDate = new Date(year, month - 1, 1);
            endDate = new Date(year, month, 0, 23, 59, 59); // Último día del mes
        }
        break;
  }

  // Consulta con paginación
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from('ventas_comprobantes') // Tu tabla
    .select('*, movimientos_inventario(*, productos(*), tam(*))', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to);

  // Aplicar filtro de fecha si no es histórico total
  if (filtro !== 'todos') {
      query = query.gte('created_at', startDate.toISOString())
                   .lte('created_at', endDate.toISOString());
  }

  const { data, error, count } = await query;

  if (error) {
      console.error(error);
      return { data: [], count: 0, error: error.message };
  }

  return { data, count, error: null };
}
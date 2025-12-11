export interface Categoria {
  id: string;
  nombre: string;
  usuario_id: string;
}

export interface Producto {
  id: string;
  nombre: string;
  sku: string | null;
  descripcion: string | null;
  stock_actual: number;
  costo_promedio: number;
  precio_venta: number;
  imagen_url: string | null;
  categoria_id: string;
}

export interface Movimiento {
  id: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  costo_unitario?: number;
  precio_real_venta?: number;
  creado_en: string;
}
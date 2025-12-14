'use client'
import { useState } from 'react'
import Select from 'react-select'
import { toast } from 'sonner'
import { crearVenta } from './actions' // Asegúrate de tener esta importación correcta

// 1. DEFINIMOS LA NUEVA PROP AQUÍ
interface ClientSalesInterfaceProps {
  productos: any[]
  onVentaCompletada?: () => void // El signo ? la hace opcional por seguridad
}

export default function ClientSalesInterface({ productos, onVentaCompletada }: ClientSalesInterfaceProps) {
  
  // --- Estados del formulario ---
  const [productoSeleccionado, setProductoSeleccionado] = useState<any>(null)
  const [cantidad, setCantidad] = useState(1)
  const [loading, setLoading] = useState(false)

  // Opciones para el Select
  const opciones = productos.map(p => ({
    value: p.id,
    label: `${p.nombre} (Stock: ${p.stock_actual}) - Q${p.precio_venta}`,
    producto: p
  }))

  // Calcular total dinámico
  const precioUnitario = productoSeleccionado?.producto?.precio_venta || 0
  const total = precioUnitario * cantidad

  const handleVenta = async () => {
    if (!productoSeleccionado) return toast.error("Selecciona un producto")
    if (cantidad <= 0) return toast.error("La cantidad debe ser mayor a 0")
    if (cantidad > productoSeleccionado.producto.stock_actual) {
      return toast.error("No hay suficiente stock")
    }

    setLoading(true)

    try {
      // Llamamos a la Server Action para guardar en DB
      await crearVenta({
        producto_id: productoSeleccionado.value,
        cantidad: cantidad,
        precio_venta: precioUnitario
      })

      toast.success("Venta registrada correctamente")

      // --- LIMPIEZA DEL FORMULARIO ---
      setProductoSeleccionado(null)
      setCantidad(1)

      // 2. ¡AQUÍ ESTÁ LA MAGIA! EJECUTAMOS LA FUNCIÓN PARA RECARGAR EL HISTORIAL
      if (onVentaCompletada) {
        onVentaCompletada()
      }

    } catch (error) {
      console.error(error)
      toast.error("Error al procesar la venta")
    } finally {
      setLoading(false)
    }
  }

  // Estilos custom para React Select (Dark Mode)
  const customStyles = {
    control: (base: any) => ({
      ...base,
      backgroundColor: '#0f172a',
      borderColor: '#334155',
      color: 'white',
      padding: '5px'
    }),
    menu: (base: any) => ({
      ...base,
      backgroundColor: '#1e293b',
      color: 'white'
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isFocused ? '#3b82f6' : '#1e293b',
      color: 'white',
      cursor: 'pointer'
    }),
    singleValue: (base: any) => ({
      ...base,
      color: 'white'
    }),
    input: (base: any) => ({
      ...base,
      color: 'white'
    })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Selector de Producto */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>
          Seleccionar Producto
        </label>
        <Select 
          options={opciones}
          value={productoSeleccionado}
          onChange={setProductoSeleccionado}
          placeholder="-- Buscar producto --"
          styles={customStyles}
          isClearable
          formatOptionLabel={(option: any) => (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>{option.producto.nombre}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>
                (Stock: {option.producto.stock_actual}) - 
                <span style={{ color: '#34d399', fontWeight: 'bold', marginLeft:'4px' }}>
                   Q{option.producto.precio_venta}
                </span>
              </span>
            </div>
          )}
        />
      </div>

      {/* Input de Cantidad */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#cbd5e1' }}>
          Cantidad a vender
        </label>
        <input 
          type="number" 
          value={cantidad}
          onChange={(e) => setCantidad(parseInt(e.target.value) || 0)}
          style={{
            width: '100%',
            padding: '0.75rem',
            backgroundColor: '#0f172a',
            border: '1px solid #3b82f6',
            borderRadius: '8px',
            color: 'white',
            fontSize: '1rem'
          }}
          min={1}
        />
      </div>

      {/* Caja de Total */}
      <div style={{
        backgroundColor: '#0f172a',
        padding: '1.5rem',
        borderRadius: '12px',
        border: '1px dashed #334155',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ color: '#94a3b8' }}>Total a cobrar:</span>
        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8' }}>
          Q{total.toFixed(2)}
        </span>
      </div>

      {/* Botón de Acción */}
      <button
        onClick={handleVenta}
        disabled={loading}
        style={{
          backgroundColor: '#3b82f6',
          color: 'white',
          padding: '1rem',
          border: 'none',
          borderRadius: '8px',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s ease',
          boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.3)'
        }}
      >
        {loading ? 'Procesando...' : 'Confirmar Venta'}
      </button>

    </div>
  )
}
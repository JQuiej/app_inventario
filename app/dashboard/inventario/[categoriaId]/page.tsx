'use client'
import { useState, useEffect } from 'react'
import { agregarStock, getProductosPorCategoria } from '@/actions/inventario' // Debes crear una versión cliente o usar useEffect
// NOTA: Para este ejemplo usaré un componente cliente que recibe datos o los carga.

export default function ProductosPage({ params }: { params: { categoriaId: string } }) {
  const [productos, setProductos] = useState<any[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  // Cargar productos
  useEffect(() => {
    getProductosPorCategoria(params.categoriaId).then(data => {
      setProductos(data || [])
      setLoading(false)
    })
  }, [params.categoriaId])

  // Filtrado por búsqueda
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.sku?.includes(busqueda)
  )

  const handleAgregarStock = async (productoId: string) => {
    const cantidadStr = prompt("¿Cuántas unidades vas a ingresar?")
    const costoStr = prompt("¿A qué COSTO compraste cada unidad?")
    
    if (cantidadStr && costoStr) {
      await agregarStock(productoId, parseInt(cantidadStr), parseFloat(costoStr))
      alert("Stock agregado y costo promedio recalculado.")
      window.location.reload() // Recargar para ver nuevos datos
    }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Inventario</h1>
        <input 
          type="text" 
          placeholder="Buscar producto o SKU..." 
          className="p-2 border rounded w-1/3"
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Costo Prom.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Precio Venta</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {productosFiltrados.map((prod) => (
              <tr key={prod.id}>
                <td className="px-6 py-4">{prod.nombre}</td>
                <td className="px-6 py-4 text-gray-500">{prod.sku}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs ${prod.stock_actual < 5 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                    {prod.stock_actual}
                  </span>
                </td>
                <td className="px-6 py-4">Q{prod.costo_promedio.toFixed(2)}</td>
                <td className="px-6 py-4 font-bold">Q{prod.precio_venta.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <button 
                    onClick={() => handleAgregarStock(prod.id)}
                    className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                  >
                    + Agregar Stock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
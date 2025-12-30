'use client'
import { useState } from 'react'
import { Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react' // <--- ICONOS NUEVOS
import { agregarStockAction } from '@/app/dashboard/inventario/categorias/[id]/actions'

export default function ClientProductTable({ initialProducts }: { initialProducts: any[] }) {
  const [filter, setFilter] = useState('')
  
  // 1. ESTADO PARA EL ORDENAMIENTO
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)
  
  // Filtrado normal
  const filteredProducts = initialProducts.filter(p => 
    p.nombre.toLowerCase().includes(filter.toLowerCase()) || 
    p.sku?.toLowerCase().includes(filter.toLowerCase())
  )

  // 2. LÓGICA DE ORDENAMIENTO
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (!sortConfig) return 0
    
    const { key, direction } = sortConfig
    
    if (a[key] < b[key]) {
      return direction === 'asc' ? -1 : 1
    }
    if (a[key] > b[key]) {
      return direction === 'asc' ? 1 : -1
    }
    return 0
  })

  // Función para activar el orden al hacer clic
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  const handleAddStock = async (productoId: string) => {
    const cantidad = prompt("¿Cantidad a ingresar?")
    if(!cantidad) return
    const costo = prompt("¿Costo UNITARIO de compra real?")
    if(!costo) return

    await agregarStockAction(productoId, parseInt(cantidad), parseFloat(costo))
    window.location.reload() 
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Buscador */}
      <div className="p-4 border-b border-slate-100 flex gap-2">
        <Search className="text-slate-400" />
        <input 
          placeholder="Buscar producto..." 
          className="outline-none w-full text-sm"
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase font-semibold text-slate-500">
          <tr>
            <th className="p-4">Producto</th>
            
            {/* 3. ENCABEZADO ORDENABLE */}
            <th 
              className="p-4 text-center cursor-pointer hover:bg-slate-100 transition select-none group"
              onClick={() => handleSort('stock_actual')}
              title="Click para ordenar"
            >
              <div className="flex items-center justify-center gap-1">
                Stock
                {/* Icono dinámico según el estado */}
                {sortConfig?.key === 'stock_actual' ? (
                  sortConfig.direction === 'asc' ? <ArrowUp size={14}/> : <ArrowDown size={14}/>
                ) : (
                  <ArrowUpDown size={14} className="opacity-0 group-hover:opacity-50 transition-opacity"/>
                )}
              </div>
            </th>

            <th className="p-4 text-right">Costo</th>
            <th className="p-4 text-right">Precio Venta</th>
            <th className="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {/* Usamos sortedProducts en lugar de filteredProducts */}
          {sortedProducts.map(p => (
            <tr key={p.id} className="hover:bg-slate-50 transition">
              <td className="p-4 font-medium text-slate-900">{p.nombre}</td>
              <td className="p-4 text-center">
                 <span className={`px-2 py-1 rounded-full text-xs font-bold ${p.stock_actual > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                   {p.stock_actual}
                 </span>
              </td>
              <td className="p-4 text-right">Q{p.costo_promedio.toFixed(2)}</td>
              <td className="p-4 text-right font-bold text-slate-900">Q{p.precio_venta.toFixed(2)}</td>
              <td className="p-4 flex justify-center gap-2">
                <button 
                  onClick={() => handleAddStock(p.id)}
                  className="bg-blue-50 text-blue-600 px-3 py-1 rounded hover:bg-blue-100 font-medium text-xs transition"
                >
                  + Stock
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
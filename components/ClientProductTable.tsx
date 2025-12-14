'use client'
import { useState } from 'react'
import { Search, History } from 'lucide-react'
import { agregarStockAction } from '@/app/dashboard/inventario/categorias/[id]/actions' // Server action que llama a SQL

export default function ClientProductTable({ initialProducts }: { initialProducts: any[] }) {
  const [filter, setFilter] = useState('')
  
  const productos = initialProducts.filter(p => 
    p.nombre.toLowerCase().includes(filter.toLowerCase()) || 
    p.sku?.toLowerCase().includes(filter.toLowerCase())
  )

  const handleAddStock = async (productoId: string) => {
    // Usamos prompt nativo por simplicidad, idealmente un Modal UI
    const cantidad = prompt("¿Cantidad a ingresar?")
    if(!cantidad) return
    const costo = prompt("¿Costo UNITARIO de compra real?")
    if(!costo) return

    await agregarStockAction(productoId, parseInt(cantidad), parseFloat(costo))
    window.location.reload() // Refrescar para ver nuevos promedios
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
            <th className="p-4 text-center">Stock</th>
            <th className="p-4 text-right">Costo</th>
            <th className="p-4 text-right">Precio Venta</th>
            <th className="p-4 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {productos.map(p => (
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
import { createClient } from '../../../utils/supabase/server'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { crearCategoria } from './actions' // Server Action simple para insertar

export default async function CategoriasPage() {
  const supabase = await createClient()
  const { data: categorias } = await supabase.from('categorias').select('*').order('creado_en', { ascending: false })

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Inventario</h1>
          <p className="text-slate-500">Selecciona una categoría para ver sus productos</p>
        </div>
        
        {/* Formulario simple inline para nueva categoría */}
        <form action={crearCategoria as any} className="flex gap-2">
          <input name="nombre" placeholder="Nueva Categoría..." required className="px-4 py-2 border rounded-lg text-sm" />
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
            <Plus size={16} /> Agregar
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {categorias?.map((cat) => (
          <Link key={cat.id} href={`/dashboard/categorias/${cat.id}`} className="group relative bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-lg text-slate-800 group-hover:text-blue-600">{cat.nombre}</h3>
              <ChevronRight className="text-slate-300 group-hover:text-blue-500" />
            </div>
            <p className="text-xs text-slate-400 mt-2">Click para ver productos</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
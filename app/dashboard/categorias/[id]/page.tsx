import { createClient } from '@/utils/supabase/server'
import ClientProductTable from '@/components/ClientProductTable' // Componente cliente para interactividad
import { agregarProductoNuevo } from './actions'
import CreateProductModal from './CreateProductModal'
import styles from './page.module.css'

export default async function ProductosDeCategoria({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  
  // Obtener nombre categoría
  const { data: cat } = await supabase.from('categorias').select('nombre').eq('id', id).single()
  
  // Obtener productos
  const { data: productos } = await supabase
    .from('productos')
    .select('*')
    .eq('categoria_id', id)
    .order('nombre')

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <span className={styles.categoryLabel}>Categoría</span>
          <h1 className={styles.categoryTitle}>{cat?.nombre}</h1>
        </div>
        
        {/* Modal o Formulario para crear producto nuevo */}
        <CreateProductModal categoriaId={id} agregarProductoNuevo={agregarProductoNuevo} />
      </div>

      {/* Tabla Cliente: Maneja búsqueda y el botón de "+ Stock" */}
      <ClientProductTable initialProducts={productos || []} />
    </div>
  )
}
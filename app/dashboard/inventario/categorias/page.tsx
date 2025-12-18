import { createClient } from '@/utils/supabase/server'
import styles from './categorias.module.css'
import CategoryCard from './CategoryCard'
import AddCategoryForm from './AddCategoryForm' // <--- IMPORTAR NUEVO COMPONENTE

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data: categorias } = await supabase
    .from('categorias')
    .select('*')
    .eq('usuario_id', user.id)
    .order('nombre')

  return (
    <div className={styles.container}>
      
      {/* Header y Formulario */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Inventario</h1>
          <p className={styles.subtitle}>Gestiona tus categorías</p>
        </div>
        
        {/* Usamos el componente cliente aquí */}
        <AddCategoryForm />
      </div>

      {/* Grid de Tarjetas */}
      <div className={styles.grid}>
        {categorias?.map((cat) => (
          <CategoryCard key={cat.id} category={cat} />
        ))}
      </div>
    </div>
  )
}
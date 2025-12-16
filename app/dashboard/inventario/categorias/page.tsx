import { createClient } from '@/utils/supabase/server'
import Link from 'next/link'
import { Plus, ChevronRight } from 'lucide-react'
import { crearCategoria } from './actions'
import styles from './categorias.module.css' // <--- Importamos los estilos

export default async function CategoriasPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  
  const { data: categorias } = await supabase
    .from('categorias')
    .select('*')
    .eq('usuario_id', user.id) // Filtro de seguridad
    .order('nombre')
    .order('creado_en', { ascending: false })

  return (
    <div className={styles.container}>
      
      {/* Header y Formulario */}
      <div className={styles.header}>
        <div className={styles.titleSection}>
          <h1>Inventario</h1>
          <p className={styles.subtitle}>Selecciona una categoría para ver sus productos</p>
        </div>
        
        <form action={crearCategoria as any} className={styles.form}>
          <input 
            name="nombre" 
            placeholder="Nueva Categoría..." 
            required 
            className={styles.input} 
            autoComplete="off"
          />
          <button className={styles.addButton}>
            <Plus size={18} /> 
            <span>Agregar</span>
          </button>
        </form>
      </div>

      {/* Grid de Tarjetas */}
      <div className={styles.grid}>
        {categorias?.map((cat) => (
          <Link 
            key={cat.id} 
            // Revisa si tu ruta es /inventario/[id] o /inventario/categorias/[id]
            // Aquí asumo que vas directo a la carpeta dinámica que arreglamos antes:
            href={`/dashboard/inventario/categorias/${cat.id}`} 
            className={styles.card}
          >
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>{cat.nombre}</h3>
              <ChevronRight className={styles.iconChevron} size={20} />
            </div>
            <p className={styles.cardFooter}>Click para ver productos</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
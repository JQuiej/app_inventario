'use client'

import { useState, useTransition } from 'react'
import { ChevronRight, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react'
import { actualizarCategoria, eliminarCategoria } from './actions'
import styles from './categorias.module.css'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner' // <--- IMPORTAMOS SONNER

export default function CategoryCard({ category }: { category: any }) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(category.nombre)
  const [isPending, startTransition] = useTransition()

  // Manejar Actualización (Igual que antes, pero con feedback visual de error/éxito)
  const handleUpdate = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (editName.trim() === category.nombre) {
      setIsEditing(false)
      return
    }

    startTransition(async () => {
      const res = await actualizarCategoria(category.id, editName)
      if (res?.error) {
        toast.error('Error al actualizar: ' + res.error)
      } else {
        toast.success('Categoría actualizada')
        setIsEditing(false)
      }
    })
  }

  // --- MANEJAR ELIMINACIÓN CON SONNER ---
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    // Mostramos el Toast de Confirmación
    toast('¿Estás seguro?', {
      description: `Se eliminará "${category.nombre}" y sus datos asociados.`,
      duration: 5000, // Damos tiempo para decidir
      action: {
        label: 'Eliminar',
        onClick: () => confirmDelete() // Llamamos a la función real si confirma
      },
      cancel: {
        label: 'Cancelar',
        onClick: () => {} // No hace nada, solo cierra
      },
    })
  }

  // Función auxiliar que ejecuta el borrado real
  const confirmDelete = () => {
    startTransition(async () => {
      const toastId = toast.loading('Eliminando categoría...') // Feedback de carga
      
      const res = await eliminarCategoria(category.id)
      
      if (res?.error) {
        toast.dismiss(toastId)
        toast.error('Error: ' + res.error)
      } else {
        toast.dismiss(toastId)
        toast.success('Categoría eliminada correctamente')
      }
    })
  }

  // Activar modo edición
  const toggleEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(!isEditing)
    setEditName(category.nombre)
  }

  // Cancelar edición
  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsEditing(false)
    setEditName(category.nombre)
  }

  // Detectar clic en la tarjeta para navegar (cuando no editamos)
  const handleCardClick = (e: React.MouseEvent) => {
    if (!isEditing) {
      router.push(`/dashboard/inventario/categorias/${category.id}`)
    }
  }

  return (
    <div 
      className={styles.card} 
      onClick={handleCardClick}
      style={{ 
        cursor: isEditing ? 'default' : 'pointer',
        opacity: isPending ? 0.6 : 1, // Feedback visual de que está "pensando"
        pointerEvents: isPending ? 'none' : 'auto' 
      }}
    >
      <div className={styles.cardHeader}>
        {isEditing ? (
          /* MODO EDICIÓN */
          <div className={styles.editWrapper} onClick={(e) => e.stopPropagation()}>
            <input 
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className={styles.editInput}
              autoFocus
              disabled={isPending}
            />
            <div className={styles.actions}>
              <button 
                onClick={handleUpdate} 
                className={`${styles.iconBtn} ${styles.saveBtn}`}
                disabled={isPending}
              >
                {isPending ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} />}
              </button>
              <button onClick={cancelEdit} className={`${styles.iconBtn} ${styles.cancelBtn}`} disabled={isPending}>
                <X size={18} />
              </button>
            </div>
          </div>
        ) : (
          /* MODO VISUALIZACIÓN */
          <>
            <h3 className={styles.cardTitle}>{category.nombre}</h3>
            
            <div className={styles.actions}>
              <button onClick={toggleEdit} className={styles.iconBtn} title="Editar">
                <Pencil size={16} />
              </button>
              <button onClick={handleDelete} className={`${styles.iconBtn} ${styles.deleteBtn}`} title="Eliminar">
                {isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
              </button>
              <ChevronRight className={styles.iconChevron} size={20} />
            </div>
          </>
        )}
      </div>
      
      {!isEditing && (
        <p className={styles.cardFooter}>Click para ver productos</p>
      )}
    </div>
  )
}
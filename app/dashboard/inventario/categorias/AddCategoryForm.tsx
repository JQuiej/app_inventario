'use client'

import { useRef, useTransition } from 'react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { crearCategoria } from './actions'
import styles from './categorias.module.css'

export default function AddCategoryForm() {
  const formRef = useRef<HTMLFormElement>(null)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (formData: FormData) => {
    const nombre = formData.get('nombre') as string
    if (!nombre.trim()) return

    startTransition(async () => {
      // 1. Llamamos a la Server Action
      const res = await crearCategoria(formData)

      // 2. Manejamos la respuesta
      if (res?.error) {
        toast.error(res.error)
      } else {
        toast.success('Categoría creada exitosamente')
        formRef.current?.reset() // Limpiamos el input
      }
    })
  }

  return (
    <form 
      ref={formRef}
      action={handleSubmit} 
      className={styles.form}
    >
      <input 
        name="nombre" 
        placeholder="Nueva Categoría..." 
        required 
        className={styles.input} 
        autoComplete="off"
        disabled={isPending} // Bloquear input
      />
      <button 
        type="submit" 
        className={styles.addButton}
        disabled={isPending} // Bloquear botón
        style={{ opacity: isPending ? 0.7 : 1 }}
      >
        {isPending ? (
          <>
            <Loader2 className="animate-spin" size={18} />
            <span>Guardando...</span>
          </>
        ) : (
          <>
            <Plus size={18} /> 
            <span>Agregar</span>
          </>
        )}
      </button>
    </form>
  )
}
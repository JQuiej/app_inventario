'use client'
import { useRef, useState, useTransition } from 'react' // <--- 1. Importamos useTransition
import { Pencil } from 'lucide-react'
import styles from './page.module.css'

export default function EditProductModal({ 
  producto, 
  categoriaId,
  editarProductoAction 
}: { 
  producto: any, 
  categoriaId: string,
  editarProductoAction: (formData: FormData) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition() // <--- 2. Inicializamos el estado

  // 3. Wrapper para manejar la transición
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await editarProductoAction(formData)
      dialogRef.current?.close()
    })
  }

  return (
    <>
      <button 
        onClick={() => dialogRef.current?.showModal()} 
        className={styles.iconBtnEdit}
        title="Editar"
        disabled={isPending} // Bloquear si algo está pasando (raro pero seguro)
      >
        <Pencil size={18} />
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Editar Producto</h3>
            <button 
              onClick={() => dialogRef.current?.close()} 
              className={styles.closeButton}
              disabled={isPending} // Bloquear cierre mientras guarda
            >
              ×
            </button>
          </div>
          
          {/* Usamos handleSubmit en el action */}
          <form action={handleSubmit} className={styles.formGrid}>
            
            <input type="hidden" name="producto_id" value={producto.id} />
            <input type="hidden" name="categoria_id" value={categoriaId} />
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre</label>
              <input 
                name="nombre" 
                className={styles.input} 
                defaultValue={producto.nombre} 
                required 
                disabled={isPending} // Bloquear input
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>SKU / Código</label>
              <input 
                name="sku" 
                className={styles.input} 
                defaultValue={producto.sku} 
                disabled={isPending} // Bloquear input
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Precio Venta (Q)</label>
              <input 
                name="precio_venta" 
                type="number" 
                step="0.01" 
                className={styles.input} 
                defaultValue={producto.precio_venta} 
                required 
                disabled={isPending} // Bloquear input
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isPending} // Bloquear botón
              style={{ opacity: isPending ? 0.7 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
            >
              {isPending ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
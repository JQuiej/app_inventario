'use client'

import { useRef } from 'react'
import styles from './page.module.css'

export default function CreateProductModal({ 
  categoriaId, 
  agregarProductoNuevo 
}: { 
  categoriaId: string
  agregarProductoNuevo: (formData: FormData) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  const openModal = () => {
    dialogRef.current?.showModal()
  }

  const closeModal = () => {
    dialogRef.current?.close()
  }

  return (
    <>
      <button onClick={openModal} className={styles.openButton}>
        + Nuevo Producto
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <button onClick={closeModal} className={styles.closeButton} aria-label="Cerrar">×</button>
          
          <h3 className={styles.modalTitle}>Agregar Producto</h3>
          
          <form action={async (formData) => {
            await agregarProductoNuevo(formData)
            closeModal()
          }}>
            <input type="hidden" name="categoria_id" value={categoriaId} />
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre del Producto</label>
              <input name="nombre" className={styles.input} placeholder="Ej. Coca Cola" required />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Precio de Venta</label>
              <input name="precio_venta" type="number" step="0.01" className={styles.input} placeholder="0.00" required />
            </div>

            <button type="submit" className={styles.submitButton}>
              Guardar Producto
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
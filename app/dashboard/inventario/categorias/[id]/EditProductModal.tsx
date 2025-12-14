'use client'
import { useRef, useState } from 'react'
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

  return (
    <>
      <button 
        onClick={() => dialogRef.current?.showModal()} 
        className={styles.iconBtnEdit}
        title="Editar"
      >
        <Pencil size={18} />
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Editar Producto</h3>
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton}>×</button>
          </div>
          
          <form action={async (formData) => {
            await editarProductoAction(formData)
            dialogRef.current?.close()
          }} className={styles.formGrid}>
            
            <input type="hidden" name="producto_id" value={producto.id} />
            <input type="hidden" name="categoria_id" value={categoriaId} />
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre</label>
              <input 
                name="nombre" 
                className={styles.input} 
                defaultValue={producto.nombre} 
                required 
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>SKU / Código</label>
              <input 
                name="sku" 
                className={styles.input} 
                defaultValue={producto.sku} 
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
              />
            </div>

            <button type="submit" className={styles.submitButton}>
              Guardar Cambios
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
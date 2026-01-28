'use client'
import { useRef, useTransition } from 'react'
import { Pencil, Loader2 } from 'lucide-react'
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
  const [isPending, startTransition] = useTransition()

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
      >
        <Pencil size={18} />
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Editar Producto</h3>
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton} disabled={isPending}>×</button>
          </div>
          
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
                disabled={isPending}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>SKU / Código</label>
              <input 
                name="sku" 
                className={styles.input} 
                defaultValue={producto.sku} 
                disabled={isPending}
              />
            </div>

            {/* --- NUEVO CAMPO: STOCK ACTUAL --- */}
            <div className={styles.formGroup}>
              <label className={styles.label}>Stock Actual</label>
              <input 
                name="stock_actual" 
                type="number" 
                className={styles.input} 
                defaultValue={producto.stock_actual} 
                required 
                disabled={isPending}
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
                disabled={isPending}
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Costo Promedio (Q)</label>
              <input 
                name="costo_promedio" 
                type="number" 
                step="0.01" 
                className={styles.input} 
                defaultValue={producto.costo_promedio} 
                required 
                disabled={isPending}
              />
            </div>

            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isPending}
              style={{ opacity: isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            >
              {isPending ? <><Loader2 className="animate-spin" size={18}/> Guardando...</> : 'Guardar Cambios'}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
'use client'
import { useRef, useState, useEffect, useTransition } from 'react' // <--- 1. Importar hook
import { Plus } from 'lucide-react'
import styles from './page.module.css'

export default function AddStockModal({ 
  producto, 
  agregarStockAction 
}: { 
  producto: any, 
  agregarStockAction: (productoId: string, cantidad: number, costo: number) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition() // <--- 2. Inicializar hook
  
  // --- ESTADOS ---
  const [cantidad, setCantidad] = useState('')
  const [costoBase, setCostoBase] = useState('') 
  
  // Descuentos
  const [tieneDescuento, setTieneDescuento] = useState(false)
  const [porcentaje, setPorcentaje] = useState('')
  
  // Resultados calculados
  const [costoFinal, setCostoFinal] = useState(0)     
  const [totalInversion, setTotalInversion] = useState(0) 

  // --- CALCULADORA AUTOMÁTICA ---
  useEffect(() => {
    const qty = parseInt(cantidad) || 0
    const base = parseFloat(costoBase) || 0
    let unitarioFinal = base

    if (tieneDescuento && porcentaje) {
      const desc = parseFloat(porcentaje) || 0
      const montoDescontado = base * (desc / 100)
      unitarioFinal = base - montoDescontado
    }

    setCostoFinal(unitarioFinal)
    setTotalInversion(qty * unitarioFinal)

  }, [cantidad, costoBase, tieneDescuento, porcentaje])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!cantidad || !costoBase) return

    // 3. Envolver la acción asíncrona en startTransition
    startTransition(async () => {
      // IMPORTANTE: Enviamos el 'costoFinal' (ya con descuento) a la base de datos
      await agregarStockAction(producto.id, parseInt(cantidad), costoFinal)
      
      // Limpiar formulario y cerrar solo al terminar
      setCantidad('')
      setCostoBase('')
      setPorcentaje('')
      setTieneDescuento(false)
      dialogRef.current?.close()
    })
  }

  return (
    <>
      <button 
        onClick={() => dialogRef.current?.showModal()} 
        className={styles.iconBtnAdd}
        title="Agregar Stock"
      >
        <Plus size={18} />
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
              <h3 className={styles.modalTitle}>Ingresar Stock</h3>
            </div>
            <button 
              onClick={() => dialogRef.current?.close()} 
              className={styles.closeButton}
              disabled={isPending} // Bloquear cierre
            >
              ×
            </button>
          </div>

          {/* Resumen del Producto */}
          <div className={styles.productSummary}>
            <div className={styles.summaryLabel}>Producto</div>
            <div className={styles.summaryValue}>{producto.nombre}</div>
            <div className={styles.summarySub}>
              Stock Actual: <span style={{color: '#fff'}}>{producto.stock_actual}</span>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className={styles.formGrid}>
            
            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cantidad a Ingresar</label>
                <input 
                  type="number" 
                  className={styles.input} 
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  placeholder="0"
                  autoFocus
                  required
                  disabled={isPending} // Bloquear input
                />
              </div>
              
              <div className={styles.formGroup}>
                <label className={styles.label}>Costo Base (Q)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className={styles.input} 
                  value={costoBase}
                  onChange={(e) => setCostoBase(e.target.value)}
                  placeholder="Precio lista"
                  required
                  disabled={isPending} // Bloquear input
                />
              </div>
            </div>

            {/* --- SECCIÓN DE DESCUENTO --- */}
            <div className={styles.checkboxWrapper}>
              <input 
                type="checkbox" 
                id="checkDescuentoStock" 
                checked={tieneDescuento}
                onChange={(e) => setTieneDescuento(e.target.checked)}
                className={styles.checkbox}
                disabled={isPending} // Bloquear check
              />
              <label htmlFor="checkDescuentoStock" className={styles.checkboxLabel}>
                ¿Aplicar descuento (%)?
              </label>
            </div>

            {tieneDescuento && (
              <div className={styles.discountPanel}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Descuento (%)</label>
                  <input 
                    type="number" 
                    className={styles.input} 
                    value={porcentaje}
                    onChange={(e) => setPorcentaje(e.target.value)}
                    placeholder="Ej. 10"
                    disabled={isPending}
                  />
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.label}>Costo Unitario Real</label>
                  <div className={styles.readonlyInput}>
                    Q{costoFinal.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            {/* --- TOTALES --- */}
            <div className={styles.totalCard}>
              <span>Inversión Total:</span>
              <span className={styles.totalAmount}>Q{totalInversion.toFixed(2)}</span>
            </div>

            {/* Botón con estado de carga */}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isPending}
              style={{ opacity: isPending ? 0.7 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
            >
              {isPending ? 'Procesando...' : 'Confirmar Ingreso'}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
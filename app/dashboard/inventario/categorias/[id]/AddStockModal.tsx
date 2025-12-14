'use client'
import { useRef, useState, useEffect } from 'react'
import { Plus, PackagePlus } from 'lucide-react'
import styles from './page.module.css'

export default function AddStockModal({ 
  producto, 
  agregarStockAction 
}: { 
  producto: any, 
  agregarStockAction: (productoId: string, cantidad: number, costo: number) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  
  // --- ESTADOS ---
  const [cantidad, setCantidad] = useState('')
  const [costoBase, setCostoBase] = useState('') // Precio de lista del proveedor
  
  // Descuentos
  const [tieneDescuento, setTieneDescuento] = useState(false)
  const [porcentaje, setPorcentaje] = useState('')
  
  // Resultados calculados
  const [costoFinal, setCostoFinal] = useState(0)     // Costo unitario real
  const [totalInversion, setTotalInversion] = useState(0) // Total a pagar

  // --- CALCULADORA AUTOMÁTICA ---
  useEffect(() => {
    const qty = parseInt(cantidad) || 0
    const base = parseFloat(costoBase) || 0
    let unitarioFinal = base

    // 1. Aplicar descuento si está activado
    if (tieneDescuento && porcentaje) {
      const desc = parseFloat(porcentaje) || 0
      const montoDescontado = base * (desc / 100)
      unitarioFinal = base - montoDescontado
    }

    // 2. Actualizar estados
    setCostoFinal(unitarioFinal)
    setTotalInversion(qty * unitarioFinal)

  }, [cantidad, costoBase, tieneDescuento, porcentaje])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!cantidad || !costoBase) return

    // IMPORTANTE: Enviamos el 'costoFinal' (ya con descuento) a la base de datos
    await agregarStockAction(producto.id, parseInt(cantidad), costoFinal)
    
    // Limpiar formulario
    setCantidad('')
    setCostoBase('')
    setPorcentaje('')
    setTieneDescuento(false)
    dialogRef.current?.close()
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
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton}>×</button>
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

            <button type="submit" className={styles.submitButton}>
              Confirmar Ingreso
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
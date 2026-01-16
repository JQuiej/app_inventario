'use client'
import { useRef, useState, useEffect, useTransition } from 'react'
import styles from './page.module.css'
import { ScanBarcode, X } from 'lucide-react'
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function CreateProductModal({ 
  categoriaId, 
  crearProductoCompleto 
}: { 
  categoriaId: string
  crearProductoCompleto: (formData: FormData) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition() // <--- HOOK DE TRANSICIÓN
  
  // --- ESTADOS ---
  const [costoBase, setCostoBase] = useState<string>('')
  const [tieneDescuento, setTieneDescuento] = useState(false)
  const [porcentaje, setPorcentaje] = useState<string>('')
  const [costoFinal, setCostoFinal] = useState<number>(0)
  
  // Estado para el SKU y el Escáner
  const [sku, setSku] = useState('') 
  const [mostrarScanner, setMostrarScanner] = useState(false)

  // --- LÓGICA DEL ESCÁNER ---
  useEffect(() => {
    let scanner: any = null;

    if (mostrarScanner) {
      scanner = new Html5QrcodeScanner(
        "reader", 
        { 
          fps: 10,
          qrbox: { width: 280, height: 80 }, 
          aspectRatio: 1.777778 
        },
        false
      );

      scanner.render(
        (decodedText: string) => {
          setSku(decodedText);
          setMostrarScanner(false);
          scanner.clear();
        }, 
        (errorMessage: any) => {
          // Ignorar errores de escaneo en progreso
        }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((error: any) => console.error("Error limpiando scanner", error));
      }
    }
  }, [mostrarScanner]);

  // --- CALCULADORA DE DESCUENTO ---
  useEffect(() => {
    const base = parseFloat(costoBase) || 0
    if (tieneDescuento && porcentaje) {
      const desc = parseFloat(porcentaje) || 0
      const dineroDescontado = base * (desc / 100)
      setCostoFinal(base - dineroDescontado)
    } else {
      setCostoFinal(base)
    }
  }, [costoBase, tieneDescuento, porcentaje])

  const abrirModal = () => {
    setCostoBase('')
    setPorcentaje('')
    setTieneDescuento(false)
    setSku('')
    setMostrarScanner(false)
    dialogRef.current?.showModal()
  }

  // --- FUNCIÓN DE ENVÍO CON TRANSITION ---
  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await crearProductoCompleto(formData)
      dialogRef.current?.close()
    })
  }

  return (
    <>
      <button onClick={abrirModal} className={styles.addButton}>
        + Nuevo Producto
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Nuevo Producto</h3>
            <button 
              onClick={() => dialogRef.current?.close()} 
              className={styles.closeButton}
              disabled={isPending} // Bloquear cierre mientras guarda
            >
              ×
            </button>
          </div>
          
          {/* --- AREA DEL ESCÁNER --- */}
          {mostrarScanner && (
            <div className={styles.scannerContainer}>
              <div className={styles.scannerHeader}>
                <span>Escanea el código</span>
                <button onClick={() => setMostrarScanner(false)} className={styles.closeScannerBtn}>
                  <X size={20} />
                </button>
              </div>
              <div id="reader" className={styles.readerBox}></div>
            </div>
          )}

          {/* Usamos el nuevo handleSubmit en el action */}
          <form action={handleSubmit} className={styles.formGrid}>
            
            <input type="hidden" name="categoria_id" value={categoriaId} />
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre</label>
              <input 
                name="nombre" 
                className={styles.input} 
                required 
                placeholder="Ej. Samsung A06" 
                disabled={isPending} 
              />
            </div>
            
            {/* INPUT SKU CON BOTÓN DE CÁMARA */}
            <div className={styles.formGroup}>
              <label className={styles.label}>SKU / Código de Barras</label>
              <div className={styles.inputWithAction}>
                <input 
                  name="sku" 
                  className={styles.input} 
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  placeholder="Escanea o escribe..."
                  disabled={isPending}
                />
                <button 
                  type="button" 
                  onClick={() => setMostrarScanner(!mostrarScanner)}
                  className={styles.scanButton}
                  title="Abrir Cámara"
                  disabled={isPending}
                >
                  <ScanBarcode size={20} />
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Precio Venta (Q)</label>
              <input 
                name="precio_venta" 
                type="number" 
                step="0.01" 
                className={styles.input} 
                required 
                disabled={isPending}
              />
            </div>

            <div className={styles.sectionDivider}>Inventario Inicial</div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cantidad Inicial</label>
                <input 
                  name="stock_inicial" 
                  type="number" 
                  className={styles.input} 
                  defaultValue="0" 
                  disabled={isPending}
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
                  placeholder="0.00"
                  disabled={isPending}
                />
              </div>
            </div>

            <div className={styles.checkboxWrapper}>
              <input 
                type="checkbox" 
                id="checkDescuentoCat" 
                checked={tieneDescuento}
                onChange={(e) => setTieneDescuento(e.target.checked)}
                className={styles.checkbox}
                disabled={isPending}
              />
              <label htmlFor="checkDescuentoCat" className={styles.checkboxLabel}>
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
                  <label className={styles.label}>Costo Real Final</label>
                  <div className={styles.readonlyInput}>
                    Q{costoFinal.toFixed(2)}
                  </div>
                </div>
              </div>
            )}

            <input type="hidden" name="costo_unitario" value={costoFinal} />

            {/* BOTÓN CON ESTADO DE CARGA */}
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={isPending} // Deshabilitar click
              style={{ opacity: isPending ? 0.7 : 1, cursor: isPending ? 'not-allowed' : 'pointer' }}
            >
              {isPending ? 'Guardando...' : 'Guardar Todo'}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
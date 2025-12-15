'use client'
import { useRef, useState, useEffect } from 'react'
import styles from './page.module.css'
import { ScanBarcode, X } from 'lucide-react' // Importamos íconos
import { Html5QrcodeScanner } from 'html5-qrcode'

export default function CreateProductModal({ 
  categoriaId, 
  crearProductoCompleto 
}: { 
  categoriaId: string
  crearProductoCompleto: (formData: FormData) => Promise<void>
}) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  
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
          // CAMBIO AQUÍ: 
          // width: 280, height: 100 hace un rectángulo ancho (tipo código de barras)
          // aspectRatio: 1.77 trata de usar la cámara en formato 16:9 (más ancho)
          qrbox: { width: 280, height: 80 }, 
          aspectRatio: 1.777778 
        },
        false
      );

      scanner.render(
        (decodedText: string) => {
          // ÉXITO: Cuando lee un código
          setSku(decodedText); // Ponemos el código en el input
          setMostrarScanner(false); // Cerramos el escáner
          scanner.clear(); // Limpiamos la cámara
        }, 
        (errorMessage: any) => {
          // Error de lectura (puedes ignorarlo, sucede mientras busca)
        }
      );
    }

    // Limpieza al desmontar o cerrar
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
    setSku('') // Limpiar SKU
    setMostrarScanner(false)
    dialogRef.current?.showModal()
  }

  return (
    <>
      <button onClick={abrirModal} className={styles.openButton}>
        + Nuevo Producto
      </button>

      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3 className={styles.modalTitle}>Nuevo Producto</h3>
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton}>×</button>
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

          <form action={async (formData) => {
            await crearProductoCompleto(formData)
            dialogRef.current?.close()
          }} className={styles.formGrid}>
            
            <input type="hidden" name="categoria_id" value={categoriaId} />
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Nombre</label>
              <input name="nombre" className={styles.input} required placeholder="Ej. Samsung A06" />
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
                />
                <button 
                  type="button" 
                  onClick={() => setMostrarScanner(!mostrarScanner)}
                  className={styles.scanButton}
                  title="Abrir Cámara"
                >
                  <ScanBarcode size={20} />
                </button>
              </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Precio Venta (Q)</label>
              <input name="precio_venta" type="number" step="0.01" className={styles.input} required />
            </div>

            <div className={styles.sectionDivider}>Inventario Inicial</div>

            <div className={styles.row}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Cantidad Inicial</label>
                <input name="stock_inicial" type="number" className={styles.input} defaultValue="0" />
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

            <button type="submit" className={styles.submitButton}>Guardar Todo</button>
          </form>
        </div>
      </dialog>
    </>
  )
}
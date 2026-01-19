'use client'
import { useState, useEffect } from 'react'
import { Printer, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

// --- COMPONENTES IMPORTADOS ---
import BarcodeScanner from './components/BarcodeScanner'
import BarcodeScannerIcc from './components/BarcodeScannerIcc'
import DPIScanner from './components/DPIScanner'
import TicketPreview from './components/TicketPreview'

// Componentes principales desacoplados
import VentaForm from './components/VentaForm'
import HistorialVentas from './components/HistorialVentas' // <--- NUEVO
import ConfigForm from './components/ConfigForm'           // <--- NUEVO

// Server Actions y Utils
import { getProductosParaVenta } from '../ventas/actions'
import { getHistorialComprobantes, getConfiguracionNegocio, guardarConfiguracion, eliminarVentaComprobante } from './actions'
import { imprimirVoucher } from '@/utils/printer'
import styles from './comprobantes.module.css'

export default function ComprobantesPage() {
  // 1. Estados Principales
  const [tab, setTab] = useState<'venta' | 'historial' | 'config'>('venta')
  const [productos, setProductos] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  const [historial, setHistorial] = useState<any[]>([])
  const [previewItem, setPreviewItem] = useState<any>(null)

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [itemToPrint, setItemToPrint] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // 2. Estado del Formulario de Venta
  const initialFormState = {
      productoId: '', precio: '', imei: '', icc: '', 
      cliente: '', dpi: '', telActivacion: '', montoActivacion: ''
  };
  const [formData, setFormData] = useState(initialFormState);

  // 3. Estado de Scanners
  const [scannerMode, setScannerMode] = useState<'none' | 'dpi' | 'barcode'>('none')
  const [scanTarget, setScanTarget] = useState<'imei' | 'icc'>('imei') 

  // --- CARGA DE DATOS ---
  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    const [prodData, configData, histData] = await Promise.all([
        getProductosParaVenta(),
        getConfiguracionNegocio(),
        getHistorialComprobantes()
    ]);
    setProductos(prodData || []);
    setConfig(configData);
    setHistorial(histData || []);
    return histData;
  }

  // --- MANEJADORES (HANDLERS) QUE PASAREMOS A LOS HIJOS ---

  // A. Impresión: Se pasa a HistorialVentas y se usa internamente
const handlePrint = (item: any) => {
    if(!config) return toast.error("Falta configuración del negocio");
    setItemToPrint(item);
    setShowPrintModal(true); // Abre el modal
  }

  const confirmarImpresion = async (tamano: '58mm' | '80mm') => {
    // Cerramos modal y mostramos loader
    setShowPrintModal(false);
    setIsPrinting(true);

    try {
        const item = itemToPrint; // El item que guardamos antes

        // Preparamos los datos (Misma lógica que tenías)
        const datos = {
            logoUrl: config.logo_url,
            negocio: config.nombre_negocio,
            direccion: config.direccion,
            telefono: config.telefono,
            garantia: config.mensaje_garantia,
            fecha: new Date(item.created_at).toLocaleDateString('es-GT'),
            correlativo: item.correlativo || '---',
            cliente: item.cliente_nombre || 'Consumidor Final',
            dpi: item.cliente_dpi || '',
            producto: item.movimientos_inventario?.productos?.nombre || 'Producto',
            precioDispositivo: parseFloat(item.movimientos_inventario?.precio_real_venta || 0),
            descuento: item.movimientos_inventario?.tam?.[0]?.monto_pendiente 
                    ? parseFloat(item.movimientos_inventario.tam[0].monto_pendiente) 
                    : 0,
            imei: item.imei_dispositivo,
            icc: item.icc,
            telefonoActivacion: item.telefono_activacion,
            montoActivacion: parseFloat(item.monto_activacion || 0),
            // Calculamos el total aquí para enviarlo ya listo
            total: (parseFloat(item.movimientos_inventario?.precio_real_venta || 0) + 
                    parseFloat(item.monto_activacion || 0) - 
                    (item.movimientos_inventario?.tam?.[0]?.monto_pendiente ? parseFloat(item.movimientos_inventario.tam[0].monto_pendiente) : 0))
        };

        // Definimos el ancho según la elección del usuario
        const anchoPapel = tamano === '58mm' ? 32 : 48;

        toast.info("Conectando a impresora...");
        
        // Llamamos a la función printer.ts actualizada
        const res = await imprimirVoucher(datos, anchoPapel);

        if(res.error) {
            toast.error("Error: " + res.error);
        } else {
            toast.success("Impresión enviada correctamente");
        }

    } catch (error) {
        toast.error("Error inesperado al imprimir");
        console.error(error);
    } finally {
        setIsPrinting(false);
        setItemToPrint(null);
    }
  }

  // B. Guardado de Configuración: Se pasa a ConfigForm
  const handleSaveConfig = async (formData: FormData) => {
      await guardarConfiguracion(formData);
      toast.success("Configuración actualizada");
      cargarTodo(); // Recargar para ver cambios (ej: logo nuevo)
  }

  // C. Eliminación: Se pasa a HistorialVentas
  const handleDeleteVenta = async (id: string) => {
      if(confirm('¿Está seguro de eliminar esta venta y devolver el stock?')) {
          await eliminarVentaComprobante(id);
          toast.success("Venta eliminada");
          cargarTodo();
      }
  }

  // D. Éxito de Venta: Se pasa a VentaForm
  const handleVentaSuccess = async (ventaCreadaResponse: any) => {
      const historialFresco = await cargarTodo();
      
      const idCreado = ventaCreadaResponse.id || ventaCreadaResponse.data?.id;
      const correlativoReal = ventaCreadaResponse.correlativo || ventaCreadaResponse.data?.correlativo;

      // Buscar venta completa en historial fresco o usar fallback
      let ventaCompleta = historialFresco?.find((v: any) => v.id === idCreado);

      if (!ventaCompleta) {
          const prodInfo = productos.find(p => p.id === formData.productoId);
          ventaCompleta = {
              id: idCreado,
              correlativo: correlativoReal,
              created_at: new Date().toISOString(),
              cliente_nombre: formData.cliente,
              cliente_dpi: formData.dpi,
              imei_dispositivo: formData.imei,
              icc: formData.icc,
              telefono_activacion: formData.telActivacion,
              monto_activacion: formData.montoActivacion,
              movimientos_inventario: {
                  precio_real_venta: formData.precio,
                  productos: { nombre: prodInfo ? prodInfo.nombre : 'Dispositivo' },
                  tam: []
              }
          };
      }

      setPreviewItem(ventaCompleta);
      toast.success(`Venta #${correlativoReal} registrada`);
  }

  return (
    <div className={styles.container}>
        <div className={styles.titleHeader}>
            <Printer className="text-blue-400"/> Ventas y Comprobantes
        </div>
        
        {/* NAVEGACIÓN TABS */}
        <div className={styles.tabsContainer}>
            <button onClick={() => setTab('venta')} className={`${styles.tabButton} ${tab === 'venta' ? styles.tabActive : ''}`}>Nueva Venta</button>
            <button onClick={() => setTab('historial')} className={`${styles.tabButton} ${tab === 'historial' ? styles.tabActive : ''}`}>Historial</button>
            <button onClick={() => setTab('config')} className={`${styles.tabButton} ${tab === 'config' ? styles.tabActive : ''}`}>Configuración</button>
        </div>

        {/* --- CONTENIDO DINÁMICO --- */}
        
        {/* TAB 1: FORMULARIO DE VENTA */}
        {tab === 'venta' && (
            <div className={styles.gridContainer}>
                <VentaForm 
                    productos={productos}
                    formData={formData}
                    setFormData={setFormData}
                    onOpenDPI={() => setScannerMode('dpi')}
                    onOpenBarcode={() => { setScanTarget('imei'); setScannerMode('barcode'); }}
                    onOpenBarcodeIcc={() => { setScanTarget('icc'); setScannerMode('barcode'); }}
                    onSuccess={handleVentaSuccess}
                />
            </div>
        )}

        {/* TAB 2: HISTORIAL (DESACOPLADO) */}
        {tab === 'historial' && (
            <HistorialVentas 
                historial={historial}
                onPrint={handlePrint}
                onPreview={setPreviewItem}
                onDelete={handleDeleteVenta}
            />
        )}

        {/* TAB 3: CONFIGURACIÓN (DESACOPLADO) */}
        {tab === 'config' && (
             <ConfigForm 
                config={config}
                onSave={handleSaveConfig}
             />
        )}

        {/* --- MODALES GLOBALES --- */}
        {previewItem && (
            <TicketPreview 
                item={previewItem} 
                config={config} 
                onClose={() => setPreviewItem(null)}
                onPrint={() => handlePrint(previewItem)} 
            />
        )}

        {showPrintModal && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                    <div className="p-6 text-center">
                        <div className="mx-auto bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mb-4">
                            <Printer className="text-blue-600" size={24} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-2">Seleccione su Impresora</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            Elige el tamaño del papel para asegurar que el ticket salga perfecto.
                        </p>

                        <div className="grid gap-3">
                            <button
                                onClick={() => confirmarImpresion('58mm')}
                                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group"
                            >
                                <span className="text-2xl">📄</span>
                                <div className="text-left">
                                    <div className="font-semibold text-gray-900 group-hover:text-blue-700">Pequeña (58mm)</div>
                                    <div className="text-xs text-gray-400">Estándar portátil</div>
                                </div>
                            </button>

                            <button
                                onClick={() => confirmarImpresion('80mm')}
                                className="flex items-center justify-center gap-3 w-full py-3 px-4 bg-white border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg transition-all group"
                            >
                                <span className="text-2xl">📃</span>
                                <div className="text-left">
                                    <div className="font-semibold text-gray-900 group-hover:text-blue-700">Grande (80mm)</div>
                                    <div className="text-xs text-gray-400">Impresora de escritorio</div>
                                </div>
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-50 p-4 border-t border-gray-100">
                        <button 
                            onClick={() => setShowPrintModal(false)}
                            className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* --- INDICADOR DE CARGA GLOBAL --- */}
        {isPrinting && (
            <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-black/50 text-white">
                <Loader2 className="animate-spin mb-4" size={48} />
                <p className="font-semibold">Imprimiendo...</p>
            </div>
        )}

        {/* --- SCANNERS --- */}
        {scannerMode === 'barcode' && (
            scanTarget === 'imei' 
            ? <BarcodeScanner onClose={() => setScannerMode('none')} onDetected={(c) => { setFormData(p => ({...p, imei: c})); toast.success("IMEI Detectado"); setScannerMode('none'); }} />
            : <BarcodeScannerIcc onClose={() => setScannerMode('none')} onDetected={(c) => { setFormData(p => ({...p, icc: c})); toast.success("ICC Detectado"); setScannerMode('none'); }} />
        )}

        {scannerMode === 'dpi' && (
            <DPIScanner 
                onClose={() => setScannerMode('none')}
                onDetected={(cui, nombre) => { setFormData(p => ({...p, dpi: cui, cliente: nombre || p.cliente})); setScannerMode('none'); }}
            />
        )}
    </div>
  )
}
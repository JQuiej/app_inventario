'use client'
import { useState, useEffect } from 'react'
import { Printer } from 'lucide-react'
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
  const handlePrint = async (item: any) => {
    if(!config) return toast.error("Falta configuración del negocio");
    
    // Preparar objeto de datos seguro
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
        montoActivacion: parseFloat(item.monto_activacion || 0)
    };
    
    toast.info("Enviando a impresora...");
    const res = await imprimirVoucher(datos, config);
    if(res.error) toast.error("Error: " + res.error);
    else toast.success("Impresión enviada");
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
            />
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
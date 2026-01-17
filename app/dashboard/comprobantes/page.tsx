'use client'
import { useState, useEffect } from 'react'
import { Printer, Camera, ScanBarcode, Eye, Save, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

// Importamos tus componentes
import BarcodeScanner from './components/BarcodeScanner'
import BarcodeScannerIcc from './components/BarcodeScannerIcc' // <--- IMPORT NUEVO
import DPIScanner from './components/DPIScanner'

import { getProductosParaVenta } from '../ventas/actions'
import { getHistorialComprobantes, crearVentaComprobante, getConfiguracionNegocio, guardarConfiguracion, eliminarVentaComprobante } from './actions'
import { imprimirVoucher } from '@/utils/printer'
import styles from './comprobantes.module.css'

export default function ComprobantesPage() {
  const [tab, setTab] = useState<'venta' | 'historial' | 'config'>('venta')
  const [productos, setProductos] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  
  // ESTADOS VENTA
  const [prodSeleccionado, setProdSeleccionado] = useState('')
  const [precio, setPrecio] = useState('') 
  const [imei, setImei] = useState('')
  const [icc, setIcc] = useState('') 
  
  // ESTADOS CLIENTE
  const [cliente, setCliente] = useState('')
  const [dpi, setDpi] = useState('')
  
  // ESTADOS ACTIVACIÓN
  const [telActivacion, setTelActivacion] = useState('')
  const [montoActivacion, setMontoActivacion] = useState('')

  // CONTROL DE ESCÁNER
  // Modo general: 'none' | 'dpi' | 'barcode'
  const [scannerMode, setScannerMode] = useState<'none' | 'dpi' | 'barcode'>('none')
  // Objetivo del escáner de barras: 'imei' | 'icc'
  const [scanTarget, setScanTarget] = useState<'imei' | 'icc'>('imei') 

  const [historial, setHistorial] = useState<any[]>([])
  const [previewItem, setPreviewItem] = useState<any>(null)

  useEffect(() => { cargarTodo() }, [])

  const cargarTodo = async () => {
    setProductos(await getProductosParaVenta() || [])
    setConfig(await getConfiguracionNegocio())
    setHistorial(await getHistorialComprobantes() || [])
  }

  const handleVenta = async () => {
    if(!prodSeleccionado || !precio) return toast.error("Seleccione producto y precio")
    if(!cliente) return toast.error("Ingrese cliente")

    const result = await crearVentaComprobante({
        producto_id: prodSeleccionado,
        precio: parseFloat(precio),
        imei: imei,
        icc: icc,
        cliente_nombre: cliente,
        cliente_dpi: dpi,
        telefono_activacion: telActivacion,
        monto_activacion: montoActivacion ? parseFloat(montoActivacion) : 0
    })

    if(result.error) {
        toast.error(result.error)
    } else {
        const historialFresco = await getHistorialComprobantes(); 
        setHistorial(historialFresco || []);
        const idCreado = (result as any).data?.id;
        const ventaCompleta = historialFresco?.find((v: any) => v.id === idCreado) || historialFresco?.[0];

        if (!ventaCompleta) {
             toast.error("Venta guardada, error al recuperar datos.");
             return;
        }

        toast.success("Venta Registrada", {
            description: `Correlativo #${ventaCompleta.correlativo}`,
            duration: 8000, 
            action: { label: '🖨️ IMPRIMIR', onClick: () => handlePrint(ventaCompleta) },
        });

        // Limpieza
        setCliente(''); setDpi(''); setImei(''); setIcc('');
        setProdSeleccionado(''); setPrecio(''); 
        setTelActivacion(''); setMontoActivacion('');
    }
  }

  const handlePrint = async (item: any) => {
    if(!config) return toast.error("Falta configuración")
    
    const precioTotalVenta = parseFloat(item.movimientos_inventario?.precio_real_venta || 0);
    const precioActivacion = parseFloat(item.monto_activacion || 0);
    let montoDescuento = 0;
    const registroTam = item.movimientos_inventario?.tam;
    if (registroTam && registroTam.length > 0) {
        montoDescuento = parseFloat(registroTam[0].monto_pendiente || 0);
    }

    const fechaObj = new Date(item.created_at);
    const fechaFormateada = fechaObj.toLocaleDateString('es-GT', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const datos = {
        logoUrl: config.logo_url,
        negocio: config.nombre_negocio,
        direccion: config.direccion,
        telefono: config.telefono,
        garantia: config.mensaje_garantia,
        fecha: fechaFormateada,
        correlativo: item.correlativo,
        cliente: item.cliente_nombre,
        dpi: item.cliente_dpi,
        producto: item.movimientos_inventario?.productos?.nombre || 'Producto',
        precioDispositivo: precioTotalVenta, 
        descuento: montoDescuento,
        imei: item.imei_dispositivo,
        icc: item.icc,
        telefonoActivacion: item.telefono_activacion,
        montoActivacion: precioActivacion
    }
    
    const res = await imprimirVoucher(datos, config)
    if(res.error) toast.error("Error: " + res.error)
    else toast.success("Imprimiendo...")
  }

  return (
    <div className={styles.container}>
        <div className={styles.titleHeader}>
            <Printer className="text-blue-400"/> Ventas y Comprobantes
        </div>
        
        <div className={styles.tabsContainer}>
            <button onClick={() => setTab('venta')} className={`${styles.tabButton} ${tab === 'venta' ? styles.tabActive : ''}`}>Nueva Venta</button>
            <button onClick={() => setTab('historial')} className={`${styles.tabButton} ${tab === 'historial' ? styles.tabActive : ''}`}>Historial</button>
            <button onClick={() => setTab('config')} className={`${styles.tabButton} ${tab === 'config' ? styles.tabActive : ''}`}>Configuración</button>
        </div>

        {tab === 'venta' && (
            <div className={styles.gridContainer}>
                <div className={styles.card}>
                    <div className={styles.inputGroup}>
                        <div className={styles.sectionTitle}>1. Dispositivo</div>
                        <select value={prodSeleccionado} onChange={e => {
                                setProdSeleccionado(e.target.value)
                                const p = productos.find(x => x.id === e.target.value)
                                if(p) setPrecio(p.precio_venta)
                            }} className={styles.select}>
                            <option value="">-- Seleccione Dispositivo --</option>
                            {productos.map(p => <option key={p.id} value={p.id}>{p.nombre} (Stock: {p.stock_actual})</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4 mb-2">
                            <div>
                                <span className={styles.label}>Precio (Q):</span>
                                <input type="number" value={precio} onChange={e => setPrecio(e.target.value)} className={styles.input} style={{fontWeight:'bold', color:'#4ade80'}} />
                            </div>
                        </div>
                        
                        {/* INPUT IMEI */}
                        <div className="mb-2">
                            <span className={styles.label}>IMEI:</span>
                            <div className="flex gap-1">
                                <input value={imei} onChange={e => setImei(e.target.value)} className={styles.input} placeholder="Escanee IMEI..." />
                                <button onClick={() => { setScanTarget('imei'); setScannerMode('barcode'); }} className={styles.btnAction} title="Escanear IMEI">
                                    <ScanBarcode size={16}/>
                                </button>
                            </div>
                        </div>

                        {/* INPUT ICC */}
                        <div>
                            <span className={styles.label}>ICC (SIM) <small style={{color:'#666'}}>(Opcional)</small>:</span>
                            <div className="flex gap-1">
                                <input value={icc} onChange={e => setIcc(e.target.value)} className={styles.input} placeholder="Escanee ICC..." />
                                <button onClick={() => { setScanTarget('icc'); setScannerMode('barcode'); }} className={styles.btnAction} title="Escanear ICC">
                                    <ScanBarcode size={16}/>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.sectionTitle}>2. Activación (Opcional)</div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><span className={styles.label}>Número:</span><input type="tel" value={telActivacion} onChange={e => setTelActivacion(e.target.value)} className={styles.input} placeholder="5555-5555" /></div>
                            <div><span className={styles.label}>Monto (Q):</span><input type="number" value={montoActivacion} onChange={e => setMontoActivacion(e.target.value)} className={styles.input} placeholder="0.00" /></div>
                        </div>
                    </div>

                    <div className={styles.inputGroup}>
                        <div className={styles.sectionTitle}>
                             3. Datos Cliente
                             <button onClick={() => setScannerMode('dpi')} className={styles.btnAction}><Camera size={14}/> DPI</button>
                        </div>
                        <input placeholder="Nombre Completo" value={cliente} onChange={e => setCliente(e.target.value)} className={styles.input} />
                        <div className="mt-2">
                            <input placeholder="DPI (CUI)" value={dpi} onChange={e => setDpi(e.target.value)} className={styles.input} />
                        </div>
                    </div>
                    <button onClick={handleVenta} className={styles.btnPrimary}><Save/> GENERAR COMPROBANTE</button>
                </div>
            </div>
        )}

        {tab === 'historial' && (
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead><tr><th>No.</th><th>Detalle</th><th style={{textAlign:'right'}}>Total</th><th style={{textAlign:'center'}}>Acciones</th></tr></thead>
                    <tbody>
                        {historial.map((item) => (
                            <tr key={item.id}>
                                <td>#{item.correlativo}</td>
                                <td>
                                    <div style={{fontWeight:'bold'}}>{item.cliente_nombre}</div>
                                    <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{item.movimientos_inventario?.productos?.nombre}</div>
                                    {item.icc && <div style={{fontSize:'0.7rem', color:'#94a3b8'}}>ICC: {item.icc}</div>}
                                    {item.telefono_activacion && <div style={{fontSize:'0.75rem', color:'#facc15'}}>Act: {item.telefono_activacion} (Q{item.monto_activacion})</div>}
                                </td>
                                <td style={{textAlign:'right', fontWeight:'bold', color:'#4ade80'}}>Q{item.movimientos_inventario?.precio_real_venta}</td>
                                <td style={{textAlign:'center'}}>
                                    <div style={{display:'flex', gap:'5px', justifyContent:'center'}}>
                                        <button onClick={() => setPreviewItem(item)} className={styles.btnAction}><Eye size={16}/></button>
                                        <button onClick={() => handlePrint(item)} className={styles.btnAction} style={{background:'#2563eb'}}>🖨️</button>
                                        <button onClick={() => { if(confirm('Borrar?')) eliminarVentaComprobante(item.id).then(()=>cargarTodo())}} className={styles.btnAction} style={{background:'#7f1d1d'}}><Trash2 size={16}/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        {tab === 'config' && (
             <form action={async (d) => { await guardarConfiguracion(d); toast.success("Guardado"); cargarTodo(); }} className={styles.card} style={{maxWidth:'500px'}}>
                <div className={styles.sectionTitle}>Datos del Negocio</div>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Logo</label>
                    <div className="flex items-center gap-4">
                        {config?.logo_url && <img src={config.logo_url} alt="Logo" className="w-16 h-16 object-contain bg-white rounded p-1" />}
                        <input type="file" name="logo" accept="image/*" className="text-sm text-slate-400 file:bg-blue-600 file:border-0 file:rounded-full file:px-4 file:py-2 file:text-white file:font-semibold"/>
                    </div>
                </div>
                <div className={styles.inputGroup}><label className={styles.label}>Dirección</label><input name="direccion" defaultValue={config?.direccion} className={styles.input}/></div>
                <div className={styles.inputGroup}><label className={styles.label}>Teléfono</label><input name="telefono" defaultValue={config?.telefono} className={styles.input}/></div>
                <div className={styles.inputGroup}><label className={styles.label}>Mensaje Garantía</label><textarea name="mensaje_garantia" defaultValue={config?.mensaje_garantia} className={styles.textarea}/></div>
                <button type="submit" className={styles.btnPrimary}>GUARDAR CAMBIOS</button>
             </form>
        )}

        {previewItem && (
             <div className={styles.previewOverlay} onClick={() => setPreviewItem(null)}>
                 <div className={styles.previewCard} onClick={e => e.stopPropagation()} style={{fontFamily: '"Courier New", Courier, monospace', padding: '20px', width: '360px', background: '#fff', color: '#000'}}>
                     {(() => {
                        const totalVenta = parseFloat(previewItem.movimientos_inventario?.precio_real_venta || 0);
                        const fecha = new Date(previewItem.created_at).toLocaleDateString('es-GT');
                        const SolidLine = () => <div style={{borderBottom: '2px solid #000', margin: '8px 0'}}></div>;
                        const Row = ({ label, value, bold }: any) => (
                            <div style={{display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 'bold' : 'normal'}}><span>{label}</span><span>{value}</span></div>
                        );
                        return (
                            <>
                                {config?.logo_url && <img src={config.logo_url} className="w-32 h-auto mx-auto mb-2 object-contain mix-blend-multiply" alt="Logo"/>}
                                <div style={{textAlign: 'center', fontSize: '0.9rem'}}>{config?.direccion}</div>
                                <div style={{textAlign: 'center', fontSize: '0.9rem'}}>Tel: {config?.telefono}</div>
                                <SolidLine />
                                <Row label="Cliente:" value={previewItem.cliente_nombre} />
                                <Row label="DPI:" value={previewItem.cliente_dpi} />
                                <SolidLine />
                                <Row label="Fecha:" value={fecha} />
                                <Row label="Folio:" value={`#${previewItem.correlativo}`} />
                                <SolidLine />
                                <div style={{fontWeight:'bold'}}>Producto:</div>
                                <div>{previewItem.movimientos_inventario?.productos?.nombre}</div>
                                {previewItem.imei_dispositivo && <div style={{fontSize:'0.8rem'}}>IMEI: {previewItem.imei_dispositivo}</div>}
                                {previewItem.icc && <div style={{fontSize:'0.8rem'}}>ICC: {previewItem.icc}</div>}
                                {previewItem.telefono_activacion && (<div style={{marginTop:'5px'}}><div>Activación: {previewItem.telefono_activacion}</div><div>Monto: Q{previewItem.monto_activacion}</div></div>)}
                                <SolidLine />
                                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold'}}><span>Total</span><span>Q{totalVenta.toFixed(2)}</span></div>
                                <SolidLine />
                                <div style={{textAlign: 'center', fontSize: '0.8rem', marginTop: '15px'}}>{config?.mensaje_garantia}</div>
                            </>
                        );
                     })()}
                 </div>
             </div>
        )}

        {/* --- LÓGICA DE SELECCIÓN DE COMPONENTE DE ESCANEO --- */}
        
        {/* Caso 1: Escáner de IMEI (Barcode normal) */}
        {scannerMode === 'barcode' && scanTarget === 'imei' && (
            <BarcodeScanner 
                onClose={() => setScannerMode('none')}
                onDetected={(code) => {
                    setImei(code);
                    toast.success(`IMEI Detectado`);
                    setScannerMode('none');
                }}
            />
        )}

        {/* Caso 2: Escáner de ICC (Barcode largo) */}
        {scannerMode === 'barcode' && scanTarget === 'icc' && (
            <BarcodeScannerIcc 
                onClose={() => setScannerMode('none')}
                onDetected={(code) => {
                    setIcc(code);
                    toast.success(`ICC Detectado`);
                    setScannerMode('none');
                }}
            />
        )}

        {/* Caso 3: Escáner de DPI */}
        {scannerMode === 'dpi' && (
            <DPIScanner 
                onClose={() => setScannerMode('none')}
                onDetected={(cui, nombre) => {
                    setDpi(cui);
                    if(nombre) setCliente(nombre);
                    setScannerMode('none');
                }}
            />
        )}
    </div>
  )
}
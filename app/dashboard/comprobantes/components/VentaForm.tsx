// app/dashboard/comprobantes/components/VentaForm.tsx
'use client'
import { useState, useMemo, useRef } from 'react'
import { Save, Camera, ScanBarcode, ImagePlus, Loader2 } from 'lucide-react' // <--- Iconos nuevos
import { toast } from 'sonner'
import { crearVentaComprobante } from '../actions'
import { extractDataFromScreenshot } from '@/utils/screenshotExtractor' // <--- Importamos el helper
import styles from '../comprobantes.module.css'

interface Props {
    productos: any[];
    onOpenDPI: () => void;
    onOpenBarcode: () => void;
    onOpenBarcodeIcc: () => void;
    onSuccess: (venta: any) => void; 
    formData: any; 
    setFormData: (data: any) => void;
}

export default function VentaForm({ productos, onOpenDPI, onOpenBarcode, onOpenBarcodeIcc, onSuccess, formData, setFormData }: Props) {
    const [loading, setLoading] = useState(false);
    
    // --- ESTADOS NUEVOS PARA IMAGEN ---
    const [processingImage, setProcessingImage] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- ESTADOS PARA EL BUSCADOR ---
    const [busqueda, setBusqueda] = useState('');
    const [mostrarMenu, setMostrarMenu] = useState(false);

    const update = (field: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [field]: value }));
    };

    // --- NUEVA LÓGICA DE CARGA DE IMAGEN ---
    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setProcessingImage(true);
        toast.info("Leyendo datos de la imagen...");

        try {
            const data = await extractDataFromScreenshot(file);
            
            if (data.error) {
                toast.warning(data.error);
            } else {
                let count = 0;
                setFormData((prev: any) => {
                    const next = { ...prev };
                    if (data.telefono) { next.telActivacion = data.telefono; count++; }
                    if (data.dpi) { next.dpi = data.dpi; count++; }
                    if (data.icc) { next.icc = data.icc; count++; }
                    if (data.imei) { next.imei = data.imei; count++; }
                    return next;
                });
                if(count > 0) toast.success(`Se extrajeron ${count} datos automáticamente.`);
            }
        } catch (error) {
            toast.error("Error al procesar la imagen");
        } finally {
            setProcessingImage(false);
            if (fileInputRef.current) fileInputRef.current.value = ''; // Limpiar input
        }
    };

    // --- LÓGICA DE FILTRADO ---
    const productosFiltrados = useMemo(() => {
        if (!busqueda) return productos;
        return productos.filter(p => 
            p.nombre.toLowerCase().includes(busqueda.toLowerCase())
        );
    }, [productos, busqueda]);

    const seleccionarProducto = (producto: any) => {
        update('productoId', producto.id);
        update('precio', producto.precio_venta);
        setBusqueda(producto.nombre);
        setMostrarMenu(false);
    };

    const handleBusquedaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBusqueda(e.target.value);
        setMostrarMenu(true);
        if (e.target.value === '') {
             update('productoId', '');
             update('precio', '');
        }
    };

    const handleSave = async () => {
        if (!formData.productoId) return toast.error("Seleccione un dispositivo de la lista");
        if (!formData.precio) return toast.error("Ingrese el precio de venta");
        if (!formData.cliente) return toast.error("Ingrese el nombre del cliente");

        setLoading(true);

        const res = await crearVentaComprobante({
            producto_id: formData.productoId,
            precio: parseFloat(formData.precio),
            imei: formData.imei,
            icc: formData.icc,
            cliente_nombre: formData.cliente,
            cliente_dpi: formData.dpi,
            telefono_activacion: formData.telActivacion,
            monto_activacion: formData.montoActivacion ? parseFloat(formData.montoActivacion) : 0
        });

        if (res.error) {
            toast.error(res.error);
        } else {
            const ventaCreada = (res as any).data || res; 
            onSuccess(ventaCreada);
            setBusqueda('');
            setFormData({
                productoId: '', precio: '', imei: '', icc: '', cliente: '', dpi: '', telActivacion: '', montoActivacion: ''
            });
        }
        setLoading(false);
    }

    return (
        <div className={styles.card} style={{position: 'relative'}}>
            {/* Input Oculto */}
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                style={{ display: 'none' }} 
            />

            {/* --- BOTÓN FLOTANTE PARA IMPORTAR --- */}
            <button 
                type="button" // Importante: type="button" para que no envíe el form al hacer clic
                onClick={() => fileInputRef.current?.click()}
                disabled={processingImage}
                className={styles.btnFloating}
                title="Importar captura de pantalla"
            >
                {/* Icono siempre visible */}
                {processingImage ? <Loader2 className="animate-spin" size={18}/> : <ImagePlus size={18}/>}
                
                {/* Texto envuelto en span para ocultarlo en móvil */}
                <span>
                    {processingImage ? "Procesando..." : "Importar Datos"}
                </span>
            </button>

            {/* --- SECCIÓN 1: DISPOSITIVO --- */}
            <div className={styles.inputGroup}>
                <div className={styles.sectionTitle}>1. Dispositivo</div>
                
                <div style={{ position: 'relative' }}>
                    <input 
                        type="text"
                        value={busqueda}
                        onChange={handleBusquedaChange}
                        onFocus={() => setMostrarMenu(true)}
                        placeholder="-- Buscar o Escanear Dispositivo --"
                        className={styles.select}
                        style={{ width: '100%', cursor: 'text' }}
                    />

                    {mostrarMenu && (
                        <>
                            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMostrarMenu(false)} />
                            <ul className={styles.dropdownMenu} style={{ 
                                position: 'absolute', top: '100%', left: 0, width: '100%', 
                                maxHeight: '250px', overflowY: 'auto', background: '#3b82f6', 
                                border: '1px solid #ccc', zIndex: 50, borderRadius: '0 0 8px 8px',
                                padding: 0, margin: 0, listStyle: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' 
                            }}>
                                {productosFiltrados.length > 0 ? (
                                    productosFiltrados.map(p => (
                                        <li 
                                            key={p.id} 
                                            onClick={() => seleccionarProducto(p)}
                                            className={styles.dropdownItem}
                                            style={{ 
                                                padding: '10px 12px', borderBottom: '1px solid #778cb1', 
                                                cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#335186'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#335186'}
                                        >
                                            <span style={{fontWeight:'bold', color: '#333'}}>{p.nombre}</span>
                                            <span style={{fontSize:'0.8em', color:'#666'}}>Stock: {p.stock_actual}</span>
                                        </li>
                                    ))
                                ) : (
                                    <li style={{ padding: '15px', color: '#999', textAlign:'center' }}>No se encontraron productos</li>
                                )}
                            </ul>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                        <span className={styles.label}>Precio Total (Q):</span>
                        <input 
                            type="number" 
                            value={formData.precio} 
                            onChange={e => update('precio', e.target.value)} 
                            className={styles.input} 
                            style={{fontWeight:'bold', color:'#4ade80'}} 
                        />
                    </div>
                </div>

                <div>
                    <span className={styles.label}>IMEI:</span>
                    <div className="flex gap-2">
                        <input 
                            value={formData.imei} 
                            onChange={e => update('imei', e.target.value)} 
                            className={styles.input} 
                            placeholder="Escanee..." 
                        />
                        <button onClick={onOpenBarcode} className={styles.btnAction} title="Escanear Código">
                            <ScanBarcode size={16}/>
                        </button>
                    </div>
                </div>

                <div>
                    <span className={styles.label}>ICC:</span>
                    <div className="flex gap-2">
                        <input 
                            value={formData.icc} 
                            onChange={e => update('icc', e.target.value)} 
                            className={styles.input} 
                            placeholder="Escanee..." 
                        />
                        <button onClick={onOpenBarcodeIcc} className={styles.btnAction} title="Escanear Código">
                            <ScanBarcode size={16}/>
                        </button>
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 2: ACTIVACIÓN --- */}
            <div className={styles.inputGroup}>
                <div className={styles.sectionTitle}>2. Activación (Opcional)</div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className={styles.label}>Número a Activar:</span>
                        <input 
                            type="tel" 
                            value={formData.telActivacion} 
                            onChange={e => update('telActivacion', e.target.value)} 
                            className={styles.input} 
                            placeholder="Ej: 5555-5555" 
                        />
                    </div>
                    <div>
                        <span className={styles.label}>Monto Recarga (Q):</span>
                        <input 
                            type="number" 
                            value={formData.montoActivacion} 
                            onChange={e => update('montoActivacion', e.target.value)} 
                            className={styles.input} 
                            placeholder="0.00" 
                        />
                    </div>
                </div>
            </div>

            {/* --- SECCIÓN 3: CLIENTE --- */}
            <div className={styles.inputGroup}>
                <div className={styles.sectionTitle}>
                     3. Datos Cliente
                     <button onClick={onOpenDPI} className={styles.btnAction}>
                        <Camera size={14}/> Escanear DPI
                     </button>
                </div>
                
                <input 
                    placeholder="Nombre Completo" 
                    value={formData.cliente} 
                    onChange={e => update('cliente', e.target.value)} 
                    className={styles.input} 
                />
                
                <div >
                    <input 
                        placeholder="DPI (CUI)" 
                        value={formData.dpi} 
                        onChange={e => update('dpi', e.target.value)} 
                        className={styles.input} 
                    />
                </div>
            </div>

            <button 
                onClick={handleSave} 
                className={styles.btnPrimary} 
                disabled={loading || processingImage}
            >
                {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"/>
                ) : (
                    <><Save size={18} className="mr-2"/> GENERAR COMPROBANTE</>
                )}
            </button>
        </div>
    )
}
'use client'
import { useState } from 'react'
import { Save, X, Loader2, ScanBarcode } from 'lucide-react'
import { toast } from 'sonner'
import { editarVentaComprobante } from '../actions'
import BarcodeScanner from './BarcodeScanner'
import BarcodeScannerIcc from './BarcodeScannerIcc'
import styles from '../comprobantes.module.css'

interface Props {
    venta: any;
    onClose: () => void;
    onSaved: () => void;
}

export default function EditarComprobanteModal({ venta, onClose, onSaved }: Props) {
    const [loading, setLoading] = useState(false)
    const [scannerMode, setScannerMode] = useState<'none' | 'imei' | 'icc'>('none')

    const [form, setForm] = useState({
        cliente_nombre:      venta.cliente_nombre        || '',
        cliente_dpi:         venta.cliente_dpi           || '',
        imei_dispositivo:    venta.imei_dispositivo      || '',
        icc:                 venta.icc                   || '',
        telefono_activacion: venta.telefono_activacion   || '',
        monto_activacion:    String(venta.monto_activacion ?? '0'),
        precio_real_venta:   String(venta.movimientos_inventario?.precio_real_venta ?? '0'),
    })

    const update = (field: string, value: string) =>
        setForm(prev => ({ ...prev, [field]: value }))

    const handleSave = async () => {
        if (!form.cliente_nombre.trim()) return toast.error('El nombre del cliente es obligatorio')
        if (!form.precio_real_venta || isNaN(Number(form.precio_real_venta)))
            return toast.error('El precio debe ser un número válido')

        setLoading(true)
        const res = await editarVentaComprobante(venta.id, {
            cliente_nombre:      form.cliente_nombre.trim(),
            cliente_dpi:         form.cliente_dpi.trim(),
            imei_dispositivo:    form.imei_dispositivo.trim(),
            icc:                 form.icc.trim(),
            telefono_activacion: form.telefono_activacion.trim(),
            monto_activacion:    parseFloat(form.monto_activacion) || 0,
            precio_real_venta:   parseFloat(form.precio_real_venta) || 0,
        })

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success(`Comprobante #${venta.correlativo} actualizado`)
            onSaved()
            onClose()
        }
        setLoading(false)
    }

    // Si hay un scanner activo, lo mostramos en pantalla completa (igual que en el form de venta)
    if (scannerMode === 'imei') {
        return (
            <BarcodeScanner
                onClose={() => setScannerMode('none')}
                onDetected={(code) => {
                    update('imei_dispositivo', code)
                    toast.success('IMEI detectado')
                    setScannerMode('none')
                }}
            />
        )
    }

    if (scannerMode === 'icc') {
        return (
            <BarcodeScannerIcc
                onClose={() => setScannerMode('none')}
                onDetected={(code) => {
                    update('icc', code)
                    toast.success('ICC detectado')
                    setScannerMode('none')
                }}
            />
        )
    }

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-lg rounded-xl overflow-hidden"
                style={{ background: '#1e293b', border: '1px solid #334155', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
            >
                {/* Header */}
                <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9' }}>
                            Editar Comprobante #{venta.correlativo}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '2px' }}>
                            {venta.movimientos_inventario?.productos?.nombre}
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.btnAction} title="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Body (scrollable) */}
                <div style={{ overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

                    {/* Sección Dispositivo */}
                    <div className={styles.inputGroup}>
                        <div className={styles.sectionTitle}>Dispositivo</div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <span className={styles.label}>Precio (Q):</span>
                                <input
                                    type="number"
                                    value={form.precio_real_venta}
                                    onChange={e => update('precio_real_venta', e.target.value)}
                                    className={styles.input}
                                    style={{ fontWeight: 'bold', color: '#4ade80' }}
                                />
                            </div>
                            <div>
                                <span className={styles.label}>Monto Recarga (Q):</span>
                                <input
                                    type="number"
                                    value={form.monto_activacion}
                                    onChange={e => update('monto_activacion', e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                        </div>

                        <div>
                            <span className={styles.label}>IMEI:</span>
                            <div className="flex gap-2">
                                <input
                                    value={form.imei_dispositivo}
                                    onChange={e => update('imei_dispositivo', e.target.value)}
                                    className={styles.input}
                                    placeholder="Escanee o ingrese manualmente"
                                />
                                <button
                                    onClick={() => setScannerMode('imei')}
                                    className={styles.btnAction}
                                    title="Escanear IMEI"
                                >
                                    <ScanBarcode size={16} />
                                </button>
                            </div>
                        </div>

                        <div>
                            <span className={styles.label}>ICC:</span>
                            <div className="flex gap-2">
                                <input
                                    value={form.icc}
                                    onChange={e => update('icc', e.target.value)}
                                    className={styles.input}
                                    placeholder="Escanee o ingrese manualmente"
                                />
                                <button
                                    onClick={() => setScannerMode('icc')}
                                    className={styles.btnAction}
                                    title="Escanear ICC"
                                >
                                    <ScanBarcode size={16} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Sección Activación */}
                    <div className={styles.inputGroup}>
                        <div className={styles.sectionTitle}>Activación</div>
                        <div>
                            <span className={styles.label}>Número a Activar:</span>
                            <input
                                type="tel"
                                value={form.telefono_activacion}
                                onChange={e => update('telefono_activacion', e.target.value)}
                                className={styles.input}
                                placeholder="Ej: 5555-5555"
                            />
                        </div>
                    </div>

                    {/* Sección Cliente */}
                    <div className={styles.inputGroup}>
                        <div className={styles.sectionTitle}>Datos del Cliente</div>
                        <div>
                            <span className={styles.label}>Nombre Completo:</span>
                            <input
                                value={form.cliente_nombre}
                                onChange={e => update('cliente_nombre', e.target.value)}
                                className={styles.input}
                                placeholder="Nombre del cliente"
                            />
                        </div>
                        <div>
                            <span className={styles.label}>DPI (CUI):</span>
                            <input
                                value={form.cliente_dpi}
                                onChange={e => update('cliente_dpi', e.target.value)}
                                className={styles.input}
                                placeholder="Número de DPI"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #334155', display: 'flex', gap: '0.75rem' }}>
                    <button
                        onClick={onClose}
                        className={styles.btnAction}
                        style={{ flex: 1, justifyContent: 'center', padding: '0.75rem' }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={styles.btnPrimary}
                        style={{ flex: 2, margin: 0, padding: '0.75rem' }}
                    >
                        {loading
                            ? <Loader2 className="animate-spin" size={18} />
                            : <><Save size={16} className="mr-2" /> Guardar Cambios</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

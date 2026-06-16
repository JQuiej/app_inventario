'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, PackagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Select from 'react-select'
import { getProductosPorCategoria, crearProductoEnPedido, editarPedido } from '../actions'
import styles from '../pedidos.module.css'

const darkSelectStyles = {
    control: (base: any, state: any) => ({
        ...base,
        backgroundColor: '#0f172a',
        borderColor: state.isFocused ? '#3b82f6' : '#475569',
        boxShadow: 'none',
        color: 'white',
        padding: '2px 4px',
        '&:hover': { borderColor: '#3b82f6' },
    }),
    menu: (base: any) => ({
        ...base,
        backgroundColor: '#1e293b',
        border: '1px solid #334155',
        zIndex: 9999,
    }),
    option: (base: any, state: any) => ({
        ...base,
        backgroundColor: state.isFocused ? '#334155' : '#1e293b',
        color: 'white',
        cursor: 'pointer',
        fontSize: '0.875rem',
        padding: '8px 12px',
    }),
    singleValue: (base: any) => ({ ...base, color: 'white', fontSize: '0.9rem' }),
    input:       (base: any) => ({ ...base, color: 'white' }),
    placeholder: (base: any) => ({ ...base, color: '#475569', fontSize: '0.9rem' }),
    clearIndicator:    (base: any) => ({ ...base, color: '#475569', cursor: 'pointer', '&:hover': { color: '#f1f5f9' } }),
    dropdownIndicator: (base: any) => ({ ...base, color: '#475569', '&:hover': { color: '#f1f5f9' } }),
    indicatorSeparator:(base: any) => ({ ...base, backgroundColor: '#334155' }),
    noOptionsMessage:  (base: any) => ({ ...base, color: '#64748b', fontSize: '0.875rem' }),
    menuPortal:        (base: any) => ({ ...base, zIndex: 9999 }),
}

interface ItemPedido {
    producto_id: string
    nombre: string
    cantidad: number
    costo_base: number
    descuento_porcentaje: number
    costo_unitario_final: number
    subtotal: number
}

interface Props {
    pedido: any
    onClose: () => void
    onSaved: () => void
}

export default function EditarPedidoModal({ pedido, onClose, onSaved }: Props) {
    const [guardando, setGuardando] = useState(false)
    const [proveedor, setProveedor] = useState(pedido.proveedor || '')
    const [productos, setProductos] = useState<any[]>([])

    // ── Ítems editables. Se inicializan con los del pedido original ──
    const [items, setItems] = useState<ItemPedido[]>(() =>
        (pedido.pedido_items || []).map((pi: any) => ({
            producto_id:         pi.producto_id,                          // campo ahora incluido en la query
            nombre:              pi.productos?.nombre || 'Producto',
            cantidad:            pi.cantidad,
            costo_base:          parseFloat(pi.costo_base),
            descuento_porcentaje: parseFloat(pi.descuento_porcentaje || 0),
            costo_unitario_final: parseFloat(pi.costo_unitario_final),
            subtotal:            parseFloat(pi.subtotal),
        }))
    )

    // ── Formulario para agregar ítem nuevo ──
    const [productoSelId, setProductoSelId] = useState('')
    const [cantidad, setCantidad] = useState('')
    const [costoBase, setCostoBase] = useState('')
    const [tieneDescuento, setTieneDescuento] = useState(false)
    const [porcentaje, setPorcentaje] = useState('')
    const [costoFinal, setCostoFinal] = useState(0)
    const [subtotalItem, setSubtotalItem] = useState(0)

    // ── Crear producto inline ──
    const [showCrearProd, setShowCrearProd] = useState(false)
    const [newNombre, setNewNombre] = useState('')
    const [newSku, setNewSku] = useState('')
    const [newPrecio, setNewPrecio] = useState('')
    const [guardandoProd, setGuardandoProd] = useState(false)

    useEffect(() => {
        getProductosPorCategoria(pedido.categoria_id).then(setProductos)
    }, [pedido.categoria_id])

    // Calculadora del ítem nuevo
    useEffect(() => {
        const qty  = parseInt(cantidad) || 0
        const base = parseFloat(costoBase) || 0
        let unitFinal = base
        if (tieneDescuento && porcentaje) {
            const desc = parseFloat(porcentaje) || 0
            unitFinal = base - base * (desc / 100)
        }
        setCostoFinal(unitFinal)
        setSubtotalItem(qty * unitFinal)
    }, [cantidad, costoBase, tieneDescuento, porcentaje])

    // ── Edición inline de un ítem existente ──
    const updateItem = (idx: number, field: 'cantidad' | 'costo_unitario_final', raw: string) => {
        const value = field === 'cantidad' ? parseInt(raw) || 1 : parseFloat(raw) || 0
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item
            const updated = { ...item, [field]: value }
            updated.subtotal = updated.cantidad * updated.costo_unitario_final
            return updated
        }))
    }

    const removeItem = (idx: number) =>
        setItems(prev => prev.filter((_, i) => i !== idx))

    // ── Agregar ítem nuevo al listado ──
    const handleAgregarItem = () => {
        if (!productoSelId) return toast.error('Seleccione un producto')
        if (!cantidad || parseInt(cantidad) <= 0) return toast.error('Ingrese una cantidad válida')
        if (!costoBase || parseFloat(costoBase) <= 0) return toast.error('Ingrese el costo base')

        const prod = productos.find(p => p.id === productoSelId)
        setItems(prev => [...prev, {
            producto_id:          productoSelId,
            nombre:               prod?.nombre || 'Producto',
            cantidad:             parseInt(cantidad),
            costo_base:           parseFloat(costoBase),
            descuento_porcentaje: tieneDescuento ? (parseFloat(porcentaje) || 0) : 0,
            costo_unitario_final: costoFinal,
            subtotal:             subtotalItem,
        }])

        // Limpiar formulario
        setProductoSelId(''); setCantidad(''); setCostoBase('')
        setTieneDescuento(false); setPorcentaje('')
        toast.success(`${prod?.nombre} agregado`)
    }

    // ── Crear producto en la categoría del pedido ──
    const handleCrearProducto = async () => {
        if (!newNombre.trim()) return toast.error('Ingrese el nombre del producto')
        if (!newPrecio || parseFloat(newPrecio) <= 0) return toast.error('Ingrese un precio de venta válido')

        setGuardandoProd(true)
        const res = await crearProductoEnPedido({
            categoriaId: pedido.categoria_id,
            nombre: newNombre, sku: newSku, precio_venta: parseFloat(newPrecio),
        })
        if (res?.error) { toast.error(res.error) } else {
            const nuevo = res.data!
            setProductos(prev => [...prev, nuevo])
            setProductoSelId(nuevo.id)
            toast.success(`"${nuevo.nombre}" creado`)
            setShowCrearProd(false)
            setNewNombre(''); setNewSku(''); setNewPrecio('')
        }
        setGuardandoProd(false)
    }

    // ── Guardar cambios ──
    const handleGuardar = async () => {
        if (items.length === 0) return toast.error('El pedido debe tener al menos un artículo')

        setGuardando(true)
        const res = await editarPedido(pedido.id, { proveedor, items })
        if (res?.error) { toast.error(res.error) } else {
            toast.success('Pedido actualizado. Stock ajustado.')
            onSaved(); onClose()
        }
        setGuardando(false)
    }

    const totalGeneral = items.reduce((sum, i) => sum + i.subtotal, 0)

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modalCard}>

                {/* Header */}
                <div className={styles.modalHeader}>
                    <div>
                        <div className={styles.modalTitle}>Editar Pedido</div>
                        <div className={styles.modalSub}>
                            Categoría: {pedido.categorias?.nombre} ·{' '}
                            {new Date(pedido.created_at).toLocaleDateString('es-GT')}
                        </div>
                    </div>
                    <button onClick={onClose} className={styles.btnAction} title="Cerrar"><X size={18} /></button>
                </div>

                {/* Body */}
                <div className={styles.modalBody}>

                    {/* Proveedor */}
                    <div>
                        <div className={styles.sectionTitle}>Información del Pedido</div>
                        <label className={styles.label}>Proveedor (Opcional)</label>
                        <input
                            value={proveedor}
                            onChange={e => setProveedor(e.target.value)}
                            className={styles.input}
                            placeholder="Ej: Distribuidora XYZ"
                        />
                    </div>

                    {/* ── Lista de ítems con edición inline ── */}
                    <div>
                        <div className={styles.sectionTitle}>
                            Artículos del Pedido
                            <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none', fontSize: '0.8rem' }}>
                                {items.length} artículo(s)
                            </span>
                        </div>

                        {items.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '1.25rem', color: '#475569', fontSize: '0.875rem', background: '#0f172a', borderRadius: '0.5rem', border: '1px dashed #334155' }}>
                                Sin artículos — agrega al menos uno abajo
                            </div>
                        ) : (
                            <div className={styles.itemsList}>
                                {items.map((item, idx) => (
                                    <div key={idx} className={styles.itemRowEdit}>
                                        {/* Nombre */}
                                        <div className={styles.itemName} style={{ marginBottom: '0.5rem' }}>
                                            {item.nombre}
                                        </div>

                                        {/* Campos editables */}
                                        <div className={styles.itemEditFields}>
                                            <div>
                                                <span className={styles.miniLabel}>Cantidad</span>
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={item.cantidad}
                                                    onChange={e => updateItem(idx, 'cantidad', e.target.value)}
                                                    className={styles.inputSmall}
                                                />
                                            </div>
                                            <div>
                                                <span className={styles.miniLabel}>Costo Unit. (Q)</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    min={0}
                                                    value={item.costo_unitario_final}
                                                    onChange={e => updateItem(idx, 'costo_unitario_final', e.target.value)}
                                                    className={styles.inputSmall}
                                                />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-end', gap: '4px' }}>
                                                <span className={styles.miniLabel} style={{ alignSelf: 'flex-end' }}>Subtotal</span>
                                                <span className={styles.itemSubtotal}>Q{item.subtotal.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '2px' }}>
                                                <button
                                                    onClick={() => removeItem(idx)}
                                                    className={styles.btnRemove}
                                                    title="Quitar artículo"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {items.length > 0 && (
                            <div className={styles.totalSummary} style={{ marginTop: '0.75rem' }}>
                                <span className={styles.totalSummaryLabel}>Total Inversión</span>
                                <span className={styles.totalSummaryValue}>Q{totalGeneral.toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* ── Agregar ítem nuevo ── */}
                    <div>
                        <div className={styles.sectionTitle}>
                            Agregar Artículo
                            <button
                                onClick={() => setShowCrearProd(v => !v)}
                                className={styles.btnAction}
                                style={{ fontSize: '0.72rem' }}
                            >
                                <PackagePlus size={13} /> Crear Producto Nuevo
                            </button>
                        </div>

                        {showCrearProd && (
                            <div className={styles.crearProdPanel} style={{ marginBottom: '1rem' }}>
                                <div className={styles.crearProdTitle}>Nuevo Producto en esta Categoría</div>
                                <div className={styles.row2}>
                                    <div>
                                        <label className={styles.label}>Nombre *</label>
                                        <input value={newNombre} onChange={e => setNewNombre(e.target.value)} className={styles.input} placeholder="Ej: Samsung A06" />
                                    </div>
                                    <div>
                                        <label className={styles.label}>SKU (Opcional)</label>
                                        <input value={newSku} onChange={e => setNewSku(e.target.value)} className={styles.input} placeholder="Código..." />
                                    </div>
                                </div>
                                <div>
                                    <label className={styles.label}>Precio de Venta (Q) *</label>
                                    <input type="number" step="0.01" value={newPrecio} onChange={e => setNewPrecio(e.target.value)} className={styles.input} placeholder="0.00" />
                                </div>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <button onClick={() => setShowCrearProd(false)} className={styles.btnSecondary} style={{ flex: '0 0 auto', padding: '0.5rem 1.25rem' }}>
                                        Cancelar
                                    </button>
                                    <button onClick={handleCrearProducto} disabled={guardandoProd} className={styles.btnAgregar}>
                                        {guardandoProd ? <Loader2 className="animate-spin" size={16} /> : 'Guardar Producto'}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className={styles.itemBuilder}>
                            <div>
                                <label className={styles.label}>Producto</label>
                                <Select
                                    options={productos.map(p => ({
                                        value: p.id,
                                        label: p.nombre,
                                        sku: p.sku,
                                        stock: p.stock_actual,
                                    }))}
                                    value={productoSelId
                                        ? (() => {
                                            const p = productos.find((x: any) => x.id === productoSelId)
                                            return p ? { value: p.id, label: p.nombre, sku: p.sku, stock: p.stock_actual } : null
                                        })()
                                        : null
                                    }
                                    onChange={(opt: any) => setProductoSelId(opt ? opt.value : '')}
                                    isClearable
                                    placeholder="— Buscar producto —"
                                    noOptionsMessage={() => 'Sin productos'}
                                    styles={darkSelectStyles}
                                    menuPortalTarget={typeof document !== 'undefined' ? document.body : undefined}
                                    formatOptionLabel={(opt: any) => (
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                                            <span>{opt.label}</span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                {opt.sku && <span>{opt.sku} · </span>}
                                                <span style={{ color: '#34d399' }}>Stock: {opt.stock}</span>
                                            </span>
                                        </div>
                                    )}
                                />
                            </div>

                            <div className={styles.row2}>
                                <div>
                                    <label className={styles.label}>Cantidad a Ingresar</label>
                                    <input type="number" value={cantidad} onChange={e => setCantidad(e.target.value)} className={styles.input} placeholder="0" />
                                </div>
                                <div>
                                    <label className={styles.label}>Costo Base (Q)</label>
                                    <input type="number" step="0.01" value={costoBase} onChange={e => setCostoBase(e.target.value)} className={styles.input} placeholder="Precio lista" />
                                </div>
                            </div>

                            <div className={styles.checkboxRow} onClick={() => setTieneDescuento(v => !v)}>
                                <input type="checkbox" id="checkDescEdit" checked={tieneDescuento}
                                    onChange={e => setTieneDescuento(e.target.checked)}
                                    onClick={e => e.stopPropagation()} />
                                <label htmlFor="checkDescEdit">¿Aplicar descuento (%)?</label>
                            </div>

                            {tieneDescuento && (
                                <div className={styles.discountGrid}>
                                    <div>
                                        <label className={styles.label}>Descuento (%)</label>
                                        <input type="number" value={porcentaje} onChange={e => setPorcentaje(e.target.value)} className={styles.input} placeholder="Ej. 10" />
                                    </div>
                                    <div>
                                        <label className={styles.label}>Costo Unitario Real</label>
                                        <div className={styles.readonlyField}>Q{costoFinal.toFixed(2)}</div>
                                    </div>
                                </div>
                            )}

                            <div className={styles.subtotalRow}>
                                <span className={styles.subtotalLabel}>Inversión Total:</span>
                                <span className={styles.subtotalValue}>Q{subtotalItem.toFixed(2)}</span>
                            </div>

                            <button onClick={handleAgregarItem} className={styles.btnAgregar}>
                                <Plus size={16} /> Agregar al Pedido
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.btnSecondary}>Cancelar</button>
                    <button onClick={handleGuardar} disabled={guardando || items.length === 0} className={styles.btnPrimary}>
                        {guardando ? <Loader2 className="animate-spin" size={18} /> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

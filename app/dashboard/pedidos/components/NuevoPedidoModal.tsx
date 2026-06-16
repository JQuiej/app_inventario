'use client'
import { useState, useEffect } from 'react'
import { X, Plus, Trash2, Save, PackagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import Select from 'react-select'
import {
    getCategorias,
    getProductosPorCategoria,
    crearProductoEnPedido,
    crearPedido,
} from '../actions'
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
    loadingMessage:    (base: any) => ({ ...base, color: '#64748b', fontSize: '0.875rem' }),
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
    onClose: () => void
    onSaved: () => void
}

export default function NuevoPedidoModal({ onClose, onSaved }: Props) {
    const [guardando, setGuardando] = useState(false)

    // Datos del formulario principal
    const [categorias, setCategorias] = useState<any[]>([])
    const [categoriaId, setCategoriaId] = useState('')
    const [proveedor, setProveedor] = useState('')

    // Productos de la categoría seleccionada
    const [productos, setProductos] = useState<any[]>([])
    const [cargandoProductos, setCargandoProductos] = useState(false)

    // Items acumulados en el pedido
    const [items, setItems] = useState<ItemPedido[]>([])

    // Formulario del ítem actual
    const [productoSelId, setProductoSelId] = useState('')
    const [cantidad, setCantidad] = useState('')
    const [costoBase, setCostoBase] = useState('')
    const [tieneDescuento, setTieneDescuento] = useState(false)
    const [porcentaje, setPorcentaje] = useState('')
    const [costoFinal, setCostoFinal] = useState(0)
    const [subtotalItem, setSubtotalItem] = useState(0)

    // Crear producto inline
    const [showCrearProd, setShowCrearProd] = useState(false)
    const [newNombre, setNewNombre] = useState('')
    const [newSku, setNewSku] = useState('')
    const [newPrecio, setNewPrecio] = useState('')
    const [guardandoProd, setGuardandoProd] = useState(false)

    // Cargar categorías al montar
    useEffect(() => {
        getCategorias().then(setCategorias)
    }, [])

    // Cargar productos al cambiar categoría
    useEffect(() => {
        if (!categoriaId) { setProductos([]); return }
        setCargandoProductos(true)
        getProductosPorCategoria(categoriaId).then(data => {
            setProductos(data)
            setCargandoProductos(false)
        })
        setProductoSelId('')
        setItems([])
    }, [categoriaId])

    // Calculadora automática (igual que AddStockModal)
    useEffect(() => {
        const qty = parseInt(cantidad) || 0
        const base = parseFloat(costoBase) || 0
        let unitFinal = base

        if (tieneDescuento && porcentaje) {
            const desc = parseFloat(porcentaje) || 0
            unitFinal = base - base * (desc / 100)
        }

        setCostoFinal(unitFinal)
        setSubtotalItem(qty * unitFinal)
    }, [cantidad, costoBase, tieneDescuento, porcentaje])

    const resetItemForm = () => {
        setProductoSelId('')
        setCantidad('')
        setCostoBase('')
        setTieneDescuento(false)
        setPorcentaje('')
    }

    const handleAgregarItem = () => {
        if (!productoSelId) return toast.error('Seleccione un producto')
        if (!cantidad || parseInt(cantidad) <= 0) return toast.error('Ingrese una cantidad válida')
        if (!costoBase || parseFloat(costoBase) <= 0) return toast.error('Ingrese el costo base')

        const prod = productos.find(p => p.id === productoSelId)
        const newItem: ItemPedido = {
            producto_id: productoSelId,
            nombre: prod?.nombre || 'Producto',
            cantidad: parseInt(cantidad),
            costo_base: parseFloat(costoBase),
            descuento_porcentaje: tieneDescuento ? (parseFloat(porcentaje) || 0) : 0,
            costo_unitario_final: costoFinal,
            subtotal: subtotalItem,
        }

        setItems(prev => [...prev, newItem])
        resetItemForm()
        toast.success(`${newItem.nombre} agregado al pedido`)
    }

    const handleCrearProducto = async () => {
        if (!newNombre.trim()) return toast.error('Ingrese el nombre del producto')
        if (!newPrecio || parseFloat(newPrecio) <= 0) return toast.error('Ingrese un precio de venta válido')

        setGuardandoProd(true)
        const res = await crearProductoEnPedido({
            categoriaId,
            nombre: newNombre,
            sku: newSku,
            precio_venta: parseFloat(newPrecio),
        })

        if (res?.error) {
            toast.error(res.error)
        } else {
            const nuevo = res.data!
            setProductos(prev => [...prev, nuevo])
            setProductoSelId(nuevo.id)
            toast.success(`"${nuevo.nombre}" creado`)
            setShowCrearProd(false)
            setNewNombre(''); setNewSku(''); setNewPrecio('')
        }
        setGuardandoProd(false)
    }

    const handleConfirmar = async () => {
        if (!categoriaId) return toast.error('Seleccione una categoría')
        if (items.length === 0) return toast.error('Agregue al menos un artículo al pedido')

        setGuardando(true)
        const res = await crearPedido({
            categoria_id: categoriaId,
            proveedor,
            items,
        })

        if (res?.error) {
            toast.error(res.error)
        } else {
            toast.success('Pedido registrado. Stock actualizado.')
            onSaved()
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
                        <div className={styles.modalTitle}>Nuevo Pedido</div>
                        <div className={styles.modalSub}>Los artículos se agregarán al inventario al confirmar</div>
                    </div>
                    <button onClick={onClose} className={styles.btnAction} title="Cerrar">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.modalBody}>

                    {/* Información del pedido */}
                    <div>
                        <div className={styles.sectionTitle}>Información del Pedido</div>
                        <div className={styles.row2}>
                            <div>
                                <label className={styles.label}>Proveedor (Opcional)</label>
                                <input
                                    value={proveedor}
                                    onChange={e => setProveedor(e.target.value)}
                                    className={styles.input}
                                    placeholder="Ej: Distribuidora XYZ"
                                />
                            </div>
                            <div>
                                <label className={styles.label}>Categoría *</label>
                                <select
                                    value={categoriaId}
                                    onChange={e => setCategoriaId(e.target.value)}
                                    className={styles.select}
                                >
                                    <option value="">— Seleccionar —</option>
                                    {categorias.map(c => (
                                        <option key={c.id} value={c.id}>{c.nombre}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Sección de artículos (solo visible al seleccionar categoría) */}
                    {categoriaId && (
                        <>
                            {/* Botón crear producto + panel inline */}
                            <div>
                                <div className={styles.sectionTitle}>
                                    Agregar Artículos
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
                                                <input
                                                    value={newNombre}
                                                    onChange={e => setNewNombre(e.target.value)}
                                                    className={styles.input}
                                                    placeholder="Ej: Samsung A06"
                                                />
                                            </div>
                                            <div>
                                                <label className={styles.label}>SKU (Opcional)</label>
                                                <input
                                                    value={newSku}
                                                    onChange={e => setNewSku(e.target.value)}
                                                    className={styles.input}
                                                    placeholder="Código de barras..."
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={styles.label}>Precio de Venta (Q) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newPrecio}
                                                onChange={e => setNewPrecio(e.target.value)}
                                                className={styles.input}
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                onClick={() => setShowCrearProd(false)}
                                                className={styles.btnSecondary}
                                                style={{ flex: '0 0 auto', padding: '0.5rem 1.25rem' }}
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleCrearProducto}
                                                disabled={guardandoProd}
                                                className={styles.btnAgregar}
                                            >
                                                {guardandoProd
                                                    ? <Loader2 className="animate-spin" size={16} />
                                                    : 'Guardar Producto'
                                                }
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Formulario del ítem (mismo estilo que AddStockModal) */}
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
                                                    const p = productos.find(x => x.id === productoSelId)
                                                    return p ? { value: p.id, label: p.nombre, sku: p.sku, stock: p.stock_actual } : null
                                                })()
                                                : null
                                            }
                                            onChange={(opt: any) => setProductoSelId(opt ? opt.value : '')}
                                            isLoading={cargandoProductos}
                                            isDisabled={cargandoProductos}
                                            isClearable
                                            placeholder="— Buscar producto —"
                                            noOptionsMessage={() => 'Sin productos en esta categoría'}
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
                                            <input
                                                type="number"
                                                value={cantidad}
                                                onChange={e => setCantidad(e.target.value)}
                                                className={styles.input}
                                                placeholder="0"
                                            />
                                        </div>
                                        <div>
                                            <label className={styles.label}>Costo Base (Q)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={costoBase}
                                                onChange={e => setCostoBase(e.target.value)}
                                                className={styles.input}
                                                placeholder="Precio lista"
                                            />
                                        </div>
                                    </div>

                                    {/* Descuento (igual que AddStockModal) */}
                                    <div
                                        className={styles.checkboxRow}
                                        onClick={() => setTieneDescuento(v => !v)}
                                    >
                                        <input
                                            type="checkbox"
                                            id="checkDescPedido"
                                            checked={tieneDescuento}
                                            onChange={e => setTieneDescuento(e.target.checked)}
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <label htmlFor="checkDescPedido">¿Aplicar descuento (%)?</label>
                                    </div>

                                    {tieneDescuento && (
                                        <div className={styles.discountGrid}>
                                            <div>
                                                <label className={styles.label}>Descuento (%)</label>
                                                <input
                                                    type="number"
                                                    value={porcentaje}
                                                    onChange={e => setPorcentaje(e.target.value)}
                                                    className={styles.input}
                                                    placeholder="Ej. 10"
                                                />
                                            </div>
                                            <div>
                                                <label className={styles.label}>Costo Unitario Real</label>
                                                <div className={styles.readonlyField}>Q{costoFinal.toFixed(2)}</div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Total ítem */}
                                    <div className={styles.subtotalRow}>
                                        <span className={styles.subtotalLabel}>Inversión Total:</span>
                                        <span className={styles.subtotalValue}>Q{subtotalItem.toFixed(2)}</span>
                                    </div>

                                    <button onClick={handleAgregarItem} className={styles.btnAgregar}>
                                        <Plus size={16} /> Agregar al Pedido
                                    </button>
                                </div>
                            </div>

                            {/* Lista de ítems acumulados */}
                            {items.length > 0 && (
                                <div>
                                    <div className={styles.sectionTitle}>
                                        Artículos en este Pedido
                                        <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none', fontSize: '0.8rem' }}>
                                            {items.length} artículo(s)
                                        </span>
                                    </div>

                                    <div className={styles.itemsList}>
                                        {items.map((item, idx) => (
                                            <div key={idx} className={styles.itemRow}>
                                                <div className={styles.itemInfo}>
                                                    <div className={styles.itemName}>{item.nombre}</div>
                                                    <div className={styles.itemMeta}>
                                                        {item.cantidad} unid. × Q{item.costo_unitario_final.toFixed(2)}
                                                        {item.descuento_porcentaje > 0 && (
                                                            <span style={{ color: '#fbbf24' }}>
                                                                {` (${item.descuento_porcentaje}% desc.)`}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                                    <span className={styles.itemSubtotal}>Q{item.subtotal.toFixed(2)}</span>
                                                    <button
                                                        onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))}
                                                        className={styles.btnRemove}
                                                        title="Quitar"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className={styles.totalSummary} style={{ marginTop: '1rem' }}>
                                        <span className={styles.totalSummaryLabel}>Total Inversión del Pedido</span>
                                        <span className={styles.totalSummaryValue}>Q{totalGeneral.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.modalFooter}>
                    <button onClick={onClose} className={styles.btnSecondary}>Cancelar</button>
                    <button
                        onClick={handleConfirmar}
                        disabled={guardando || items.length === 0}
                        className={styles.btnPrimary}
                    >
                        {guardando
                            ? <Loader2 className="animate-spin" size={18} />
                            : <><Save size={16} /> Confirmar Pedido</>
                        }
                    </button>
                </div>
            </div>
        </div>
    )
}

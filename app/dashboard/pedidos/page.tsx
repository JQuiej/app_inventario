'use client'
import { useState, useEffect } from 'react'
import { ClipboardList, Plus, Eye, X, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { getPedidos, eliminarPedido } from './actions'
import NuevoPedidoModal from './components/NuevoPedidoModal'
import EditarPedidoModal from './components/EditarPedidoModal'
import styles from './pedidos.module.css'

export default function PedidosPage() {
    const [pedidos, setPedidos] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showNuevo, setShowNuevo] = useState(false)
    const [detalle, setDetalle] = useState<any>(null)
    const [editItem, setEditItem] = useState<any>(null)
    const [mesFiltro, setMesFiltro] = useState(() => {
        const hoy = new Date()
        return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`
    })

    useEffect(() => { cargar() }, [])

    const cargar = async () => {
        setLoading(true)
        const data = await getPedidos()
        setPedidos(data)
        setLoading(false)
    }

    const pedidosFiltrados = mesFiltro
        ? pedidos.filter(p => p.created_at?.startsWith(mesFiltro))
        : pedidos

    const handleEliminar = (pedido: any) => {
        toast('¿Eliminar este pedido?', {
            description: `Se revertirá el stock de ${pedido.pedido_items?.length || 0} artículo(s).`,
            action: {
                label: 'SÍ, ELIMINAR',
                onClick: async () => {
                    const promise = eliminarPedido(pedido.id)
                    toast.promise(promise, {
                        loading: 'Eliminando y revirtiendo stock...',
                        success: () => { cargar(); return 'Pedido eliminado' },
                        error: 'Error al eliminar el pedido',
                    })
                },
            },
            cancel: { label: 'Cancelar', onClick: () => {} },
        })
    }

    return (
        <div className={styles.container}>

            {/* Header */}
            <div className={styles.pageHeader}>
                <div className={styles.titleGroup}>
                    <h1 className={styles.pageTitle}>
                        <ClipboardList size={28} /> Pedidos
                    </h1>
                    <p className={styles.pageSubtitle}>Registro de compras por pedido · el stock se actualiza al confirmar</p>
                </div>
                <button onClick={() => setShowNuevo(true)} className={styles.btnNuevo}>
                    <Plus size={18} /> Nuevo Pedido
                </button>
            </div>

            {/* Filtro por mes */}
            <div className={styles.filterBar}>
                <span className={styles.filterLabel}>Mes:</span>
                <input
                    type="month"
                    value={mesFiltro}
                    onChange={e => setMesFiltro(e.target.value)}
                    className={styles.filterInput}
                />
                {mesFiltro && (
                    <button onClick={() => setMesFiltro('')} className={styles.btnClearFilter}>
                        Ver todos
                    </button>
                )}
                {!loading && (
                    <span className={styles.filterCount}>
                        {pedidosFiltrados.length} pedido(s)
                    </span>
                )}
            </div>

            {/* Tabla de historial */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Categoría</th>
                            <th>Proveedor</th>
                            <th>Artículos</th>
                            <th>Total Inversión</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                    Cargando pedidos...
                                </td>
                            </tr>
                        ) : pedidosFiltrados.length === 0 ? (
                            <tr>
                                <td colSpan={6}>
                                    <div className={styles.emptyState}>
                                        <ClipboardList size={48} style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.2 }} />
                                        <div className={styles.emptyText}>
                                            {mesFiltro ? 'Sin pedidos en este mes' : 'Sin pedidos registrados'}
                                        </div>
                                        <div className={styles.emptySub}>
                                            {mesFiltro
                                                ? 'Cambie el filtro de mes o presione "Ver todos"'
                                                : 'Presione "Nuevo Pedido" para registrar su primera compra'}
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            pedidosFiltrados.map(p => (
                                <tr key={p.id}>
                                    <td style={{ whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.875rem' }}>
                                        {new Date(p.created_at).toLocaleDateString('es-GT', {
                                            day: '2-digit', month: '2-digit', year: 'numeric',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td>
                                        <span className={styles.badgeCategoria}>
                                            {p.categorias?.nombre || '—'}
                                        </span>
                                    </td>
                                    <td>
                                        {p.proveedor
                                            ? <span style={{ fontWeight: 600 }}>{p.proveedor}</span>
                                            : <span className={styles.muted}>—</span>
                                        }
                                    </td>
                                    <td style={{ color: '#94a3b8' }}>
                                        {p.pedido_items?.length || 0} artículo(s)
                                    </td>
                                    <td className={styles.totalGreen}>
                                        Q{parseFloat(p.total_inversion || 0).toFixed(2)}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'center' }}>
                                            <button
                                                onClick={() => setDetalle(p)}
                                                className={styles.btnAction}
                                                title="Ver detalle"
                                            >
                                                <Eye size={15} />
                                            </button>
                                            <button
                                                onClick={() => setEditItem(p)}
                                                className={styles.btnAction}
                                                style={{ background: '#0f766e', color: 'white', borderColor: '#0f766e' }}
                                                title="Editar pedido"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleEliminar(p)}
                                                className={styles.btnAction}
                                                style={{ background: '#7f1d1d', color: 'white', borderColor: '#7f1d1d' }}
                                                title="Eliminar pedido"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal editar pedido */}
            {editItem && (
                <EditarPedidoModal
                    pedido={editItem}
                    onClose={() => setEditItem(null)}
                    onSaved={() => { setEditItem(null); cargar() }}
                />
            )}

            {/* Modal nuevo pedido */}
            {showNuevo && (
                <NuevoPedidoModal
                    onClose={() => setShowNuevo(false)}
                    onSaved={() => { setShowNuevo(false); cargar() }}
                />
            )}

            {/* Modal detalle del pedido */}
            {detalle && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalCardSm}>

                        <div className={styles.modalHeader}>
                            <div>
                                <div className={styles.modalTitle}>
                                    Detalle del Pedido
                                </div>
                                <div className={styles.modalSub}>
                                    {new Date(detalle.created_at).toLocaleDateString('es-GT', {
                                        day: '2-digit', month: 'long', year: 'numeric'
                                    })}
                                </div>
                            </div>
                            <button onClick={() => setDetalle(null)} className={styles.btnAction}>
                                <X size={18} />
                            </button>
                        </div>

                        <div className={styles.modalBody}>

                            {/* Meta info */}
                            <div className={styles.detailMeta}>
                                <div className={styles.detailMetaItem}>
                                    <div className={styles.detailMetaLabel}>Categoría</div>
                                    <div className={styles.detailMetaValue}>{detalle.categorias?.nombre || '—'}</div>
                                </div>
                                <div className={styles.detailMetaItem}>
                                    <div className={styles.detailMetaLabel}>Proveedor</div>
                                    <div className={styles.detailMetaValue}>{detalle.proveedor || '—'}</div>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <div className={styles.sectionTitle}>
                                    Artículos
                                    <span style={{ color: '#64748b', fontWeight: 400, textTransform: 'none', fontSize: '0.8rem' }}>
                                        {detalle.pedido_items?.length || 0} artículo(s)
                                    </span>
                                </div>
                                <div className={styles.itemsList}>
                                    {(detalle.pedido_items || []).map((item: any) => (
                                        <div key={item.id} className={styles.detailItemRow}>
                                            <div>
                                                <div className={styles.detailItemName}>
                                                    {item.productos?.nombre || '—'}
                                                </div>
                                                <div className={styles.detailItemMeta}>
                                                    {item.cantidad} unid. × Q{parseFloat(item.costo_unitario_final).toFixed(2)}
                                                    {item.descuento_porcentaje > 0 && (
                                                        <span style={{ color: '#fbbf24' }}>
                                                            {` (${item.descuento_porcentaje}% desc.)`}
                                                        </span>
                                                    )}
                                                    {item.costo_base !== item.costo_unitario_final && (
                                                        <span style={{ color: '#475569' }}>
                                                            {` · Base: Q${parseFloat(item.costo_base).toFixed(2)}`}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={styles.detailItemTotal}>
                                                Q{parseFloat(item.subtotal).toFixed(2)}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Total */}
                            <div className={styles.totalSummary}>
                                <span className={styles.totalSummaryLabel}>Total Inversión</span>
                                <span className={styles.totalSummaryValue}>
                                    Q{parseFloat(detalle.total_inversion || 0).toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.modalFooter}>
                            <button onClick={() => setDetalle(null)} className={styles.btnPrimary}>
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

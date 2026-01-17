// app/dashboard/comprobantes/components/HistorialVentas.tsx
'use client'
import { useState, useEffect } from 'react'
import { Eye, Printer, Trash2, ChevronLeft, ChevronRight, Filter } from 'lucide-react'
import { getHistorialFiltrado, eliminarVentaComprobante } from '../actions'
import { toast } from 'sonner'
import styles from '../comprobantes.module.css'

interface Props {
    onPrint: (item: any) => void;
    onPreview: (item: any) => void;
    refreshTrigger: number;
}

export default function HistorialVentas({ onPrint, onPreview, refreshTrigger }: Props) {
    const [ventas, setVentas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Estados de Filtro
    const [filtro, setFiltro] = useState('hoy');
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    
    // Estados de Paginación
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const LIMIT = 10;

    useEffect(() => {
        cargarDatos();
    }, [filtro, mesSeleccionado, page, refreshTrigger]);

    const cargarDatos = async () => {
        setLoading(true);
        const fecha = filtro === 'por_mes' ? mesSeleccionado : undefined;
        
        const { data, count, error } = await getHistorialFiltrado(filtro, fecha, page, LIMIT);
        
        if (error) toast.error("Error cargando historial");
        else {
            setVentas(data || []);
            setTotalItems(count || 0);
        }
        setLoading(false);
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Eliminar venta? Esto devolverá el stock.')) return;
        setLoading(true); 
        await eliminarVentaComprobante(id);
        toast.success("Venta eliminada");
        cargarDatos();
    }

    const totalPages = Math.ceil(totalItems / LIMIT);

    return (
        <div>
            {/* --- BARRA DE FILTROS --- */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                    <Filter size={18} color="#64748b"/>
                    
                    <select 
                        value={filtro} 
                        onChange={(e) => { setFiltro(e.target.value); setPage(1); }} 
                        className={styles.select}
                        style={{ width: 'auto', padding: '5px 10px', fontSize: '0.9rem' }}
                    >
                        <option value="hoy">Hoy</option>
                        <option value="ayer">Ayer</option>
                        <option value="7dias">Últimos 7 días</option>
                        <option value="mes_actual">Este Mes</option>
                        <option value="por_mes">Historial por Mes</option>
                    </select>

                    {filtro === 'por_mes' && (
                        <input 
                            type="month" 
                            value={mesSeleccionado}
                            onChange={(e) => { setMesSeleccionado(e.target.value); setPage(1); }}
                            className={styles.input}
                            style={{ width: 'auto', padding: '5px 10px' }}
                        />
                    )}
                </div>
                
                {/* Se eliminó el texto "Total: {totalItems} registros" de aquí */}
            </div>

            {/* --- TABLA --- */}
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>No.</th>
                            <th>Fecha</th> 
                            <th>Detalle</th>
                            <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px' }}>Cargando datos...</td></tr>
                        ) : ventas.length === 0 ? (
                            <tr><td colSpan={5} style={{ textAlign: 'center', padding: '20px', color: '#94a3b8' }}>Sin ventas encontradas</td></tr>
                        ) : (
                            ventas.map((v) => (
                                <tr key={v.id}>
                                    <td style={{ fontSize: '0.85rem' }}>#{v.correlativo}</td>
                                    {/* --- DATO FECHA --- */}
                                    <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#475569' }}>
                                        {new Date(v.created_at).toLocaleDateString('es-GT', {
                                            day: '2-digit', month: '2-digit', year: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 'bold' }}>{v.cliente_nombre}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{v.movimientos_inventario?.productos?.nombre}</div>
                                        {v.telefono_activacion && (
                                            <div style={{ fontSize: '0.75rem', color: '#facc15', marginTop: '2px' }}>
                                                No. Tel: {v.telefono_activacion}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <div style={{ display: 'flex', gap: '5px', justifyContent: 'center' }}>
                                            <button onClick={() => onPreview(v)} className={styles.btnAction} title="Ver Detalle">
                                                <Eye size={16}/>
                                            </button>
                                            <button onClick={() => onPrint(v)} className={styles.btnAction} style={{ background: '#2563eb' }} title="Imprimir">
                                                <Printer size={16}/>
                                            </button>
                                            <button onClick={() => handleDelete(v.id)} className={styles.btnAction} style={{ background: '#7f1d1d' }} title="Eliminar">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* --- PAGINACIÓN --- */}
            {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px', marginTop: '20px' }}>
                    <button 
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => p - 1)}
                        className={styles.btnAction}
                        style={{ opacity: page === 1 ? 0.5 : 1, background: '#e2e8f0', color: '#333' }}
                    >
                        <ChevronLeft size={20}/>
                    </button>
                    
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#475569' }}>
                        Página {page} de {totalPages}
                    </span>
                    
                    <button 
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => p + 1)}
                        className={styles.btnAction}
                        style={{ opacity: page === totalPages ? 0.5 : 1, background: '#e2e8f0', color: '#333' }}
                    >
                        <ChevronRight size={20}/>
                    </button>
                </div>
            )}
        </div>
    )
}
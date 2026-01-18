'use client'
import { useState, useEffect } from 'react'
// 1. Importamos el icono Search
import { Eye, Printer, Trash2, ChevronLeft, ChevronRight, Filter, Search } from 'lucide-react'
import { getHistorialFiltrado, eliminarVentaComprobante } from '../actions'
import { toast } from 'sonner'
import styles from '../comprobantes.module.css'

interface Props {
  historial: any[];
  onPrint: (item: any) => void;
  onPreview: (item: any) => void;
  onDelete: (id: string) => void;
}

export default function HistorialVentas({ historial, onPrint, onPreview, onDelete }: Props) {
    const [ventas, setVentas] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Estados de Filtro
    const [filtro, setFiltro] = useState('hoy');
    const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7));
    
    // 2. Nuevo Estado de Búsqueda
    const [busqueda, setBusqueda] = useState('');

    // Estados de Paginación
    const [page, setPage] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const LIMIT = 10;

    // 3. Effect con Debounce (Retraso para búsqueda)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            cargarDatos();
        }, 500); // Espera 500ms después de que dejes de escribir

        return () => clearTimeout(timeoutId);
    }, [filtro, mesSeleccionado, page, busqueda]); // <-- Agregamos busqueda a dependencias

    const cargarDatos = async () => {
        setLoading(true);
        const fecha = filtro === 'por_mes' ? mesSeleccionado : undefined;
        
        // 4. Pasamos el término de búsqueda a la acción del servidor
        // Asegúrate de actualizar tu action para recibir este 5to parámetro
        const { data, count, error } = await getHistorialFiltrado(filtro, fecha, page, LIMIT, busqueda);
        
        if (error) toast.error("Error cargando historial");
        else {
            setVentas(data || []);
            setTotalItems(count || 0);
        }
        setLoading(false);
    }


    const handleDelete = (id: string) => {
        // Usamos toast custom para confirmar
        toast("¿Eliminar esta venta?", {
            description: "Se devolverá el stock al inventario.",
            action: {
                label: "SÍ, ELIMINAR",
                onClick: async () => {
                    // Iniciamos el proceso visual de carga
                    const promise = eliminarVentaComprobante(id);
                    
                    toast.promise(promise, {
                        loading: 'Eliminando y devolviendo stock...',
                        success: () => {
                            cargarDatos(); // Recargar la lista al terminar
                            return 'Venta eliminada correctamente';
                        },
                        error: 'Error al eliminar la venta',
                    });
                },
            },
            cancel: {
                label: "Cancelar",
                onClick: () => console.log("Cancelado"),
            },
        });
    }

    const totalPages = Math.ceil(totalItems / LIMIT);

    return (
        <div>
            {/* --- BARRA DE HERRAMIENTAS (FILTROS + BUSCADOR) --- */}
            <div className={styles.toolbarContainer}>
                
                {/* GRUPO 1: FILTROS DE FECHA */}
                <div className={styles.filterGroup}>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Filter size={18}/>
                    </div>
                    
                    <select 
                        value={filtro} 
                        onChange={(e) => { setFiltro(e.target.value); setPage(1); }} 
                        className={styles.select}
                        style={{ width: 'auto', padding: '8px 12px', fontSize: '0.9rem' }}
                    >
                        <option value="hoy">Hoy</option>
                        <option value="ayer">Ayer</option>
                        <option value="7dias">Últimos 7 días</option>
                        <option value="mes_actual">Este Mes</option>
                        <option value="por_mes">Por Mes</option>
                    </select>

                    {filtro === 'por_mes' && (
                        <input 
                            type="month" 
                            value={mesSeleccionado}
                            onChange={(e) => { setMesSeleccionado(e.target.value); setPage(1); }}
                            className={styles.input}
                            style={{ width: 'auto', padding: '6px 10px' }}
                        />
                    )}
                </div>

                {/* GRUPO 2: BUSCADOR (NUEVO) */}
                <div className={styles.searchBox}>
                    <Search className={styles.searchIcon} size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar cliente, producto, correlativo..."
                        value={busqueda}
                        onChange={(e) => { setBusqueda(e.target.value); setPage(1); }}
                        className={styles.searchInputHistory}
                    />
                </div>

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
                                        <tr>
                                            {/* Usamos un div dentro del td para controlar el estilo independientemente de la tabla */}
                                            <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center' }}>
                                                <div style={{ color: '#94a3b8' }}>Cargando datos...</div>
                                            </td>
                                        </tr>
                                    ) : ventas.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '40px 20px', textAlign: 'center' }}>
                                                <div style={{ color: '#94a3b8', fontSize: '0.95rem' }}>
                                                    {busqueda ? 'No se encontraron resultados' : 'Sin ventas en este periodo'}
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                            ventas.map((v) => (
                                <tr key={v.id}>
                                    <td style={{ fontSize: '0.85rem' }}>#{v.correlativo}</td>
                                    <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                                        {new Date(v.created_at).toLocaleDateString('es-GT', {
                                            day: '2-digit', month: '2-digit',
                                            hour: '2-digit', minute: '2-digit'
                                        })}
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 'bold', color:'#f1f5f9' }}>{v.cliente_nombre}</div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{v.movimientos_inventario?.productos?.nombre}</div>
                                        {v.telefono_activacion && (
                                            <div style={{ fontSize: '0.75rem', color: '#facc15', marginTop: '2px' }}>
                                                Tel: {v.telefono_activacion}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                         <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-start' }}> {/* Ajustado a flex-start para móvil */}
                                            <button onClick={() => onPreview(v)} className={styles.btnAction} title="Ver Detalle">
                                                <Eye size={16}/>
                                            </button>
                                            <button onClick={() => onPrint(v)} className={styles.btnAction} style={{ background: '#2563eb', color:'white', borderColor:'#2563eb' }} title="Imprimir">
                                                <Printer size={16}/>
                                            </button>
                                            <button onClick={() => handleDelete(v.id)} className={styles.btnAction} style={{ background: '#7f1d1d', color:'white', borderColor:'#7f1d1d' }} title="Eliminar">
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
                        style={{ opacity: page === 1 ? 0.5 : 1 }}
                    >
                        <ChevronLeft size={20}/>
                    </button>
                    
                    <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: '#94a3b8' }}>
                        Página {page} de {totalPages}
                    </span>
                    
                    <button 
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => p + 1)}
                        className={styles.btnAction}
                        style={{ opacity: page === totalPages ? 0.5 : 1 }}
                    >
                        <ChevronRight size={20}/>
                    </button>
                </div>
            )}
        </div>
    )
}
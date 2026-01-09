'use client'
import { useState, useEffect } from 'react'
import { Calendar, Filter, DollarSign, Trash2, Tag } from 'lucide-react' // <--- 1. Agregado Tag
import { toast } from 'sonner'
import ClientSalesInterface from './ClientSalesInterface'
// IMPORTANTE: Importa las nuevas funciones y el modal
import { getProductosParaVenta, getHistorialFiltrado, eliminarVenta, getCategorias } from './actions' // <--- 2. Agregado getCategorias
import EditSaleModal from './EditSaleModal'
import styles from './ventas.module.css'

export default function VentasPage() {
  const [productos, setProductos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros de Fecha
  const [filtroTipo, setFiltroTipo] = useState('hoy')
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7))
  
  // --- 3. NUEVOS ESTADOS PARA CATEGORÍA ---
  const [categorias, setCategorias] = useState<any[]>([])
  const [filtroCategoria, setFiltroCategoria] = useState('todas') 
  // -------------------------------------

  const [totalPeriodo, setTotalPeriodo] = useState(0)

  // Carga inicial
  useEffect(() => {
    getProductosParaVenta().then(data => setProductos(data || []))
    // Cargar categorías para el filtro
    getCategorias().then(data => setCategorias(data || [])) 
  }, [])

  const cargarHistorial = async () => {
    setLoading(true)
    const ahora = new Date()
    let inicio = new Date()
    let fin = new Date()
    fin.setHours(23, 59, 59, 999)

    switch (filtroTipo) {
      case 'hoy': inicio.setHours(0, 0, 0, 0); break;
      case 'ayer': 
        inicio.setDate(ahora.getDate() - 1); inicio.setHours(0, 0, 0, 0); 
        fin.setDate(ahora.getDate() - 1); fin.setHours(23, 59, 59, 999);
        break;
      case '7dias': inicio.setDate(ahora.getDate() - 7); inicio.setHours(0, 0, 0, 0); break;
      case 'mes': inicio.setDate(1); inicio.setHours(0, 0, 0, 0); break;
      case 'historial':
        const [year, month] = mesSeleccionado.split('-');
        inicio = new Date(parseInt(year), parseInt(month) - 1, 1);
        fin = new Date(parseInt(year), parseInt(month), 0); fin.setHours(23, 59, 59, 999);
        break;
    }

    // --- 4. PASAMOS EL FILTRO DE CATEGORÍA A LA QUERY ---
    const data = await getHistorialFiltrado(inicio.toISOString(), fin.toISOString(), filtroCategoria)
    
    setHistorial(data || [])
    const total = data?.reduce((acc: number, mov: any) => acc + ((mov.precio_real_venta || 0) * (mov.cantidad || 1)), 0) || 0
    setTotalPeriodo(total)
    setLoading(false)
  }

  // Agregamos filtroCategoria a las dependencias para recargar al cambiar
  useEffect(() => { cargarHistorial() }, [filtroTipo, mesSeleccionado, filtroCategoria])

  const handleDelete = (id: string) => {
    toast('¿Eliminar esta venta?', {
        description: 'El stock será devuelto al inventario.',
        action: {
            label: 'Eliminar',
            onClick: async () => {
                await eliminarVenta(id)
                cargarHistorial() // Recargar tabla
                getProductosParaVenta().then(setProductos) // Actualizar stock visual en formulario
                toast.success('Venta eliminada y stock devuelto')
            }
        },
        cancel: { 
        label: 'Cancelar',
        onClick: () => {}
      },
        actionButtonStyle: { backgroundColor: '#ef4444' }
    })
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Punto de Venta</h1>
      
      <div className={styles.grid}>
        
        {/* PANEL IZQUIERDO */}
        <div className={styles.panel}>
            <ClientSalesInterface 
                productos={productos} 
                onVentaCompletada={() => {
                    cargarHistorial()
                    getProductosParaVenta().then(setProductos)
                }}
            />
        </div>

        {/* PANEL DERECHO */}
        <div className={styles.panel}>
          
          <div className={styles.historyHeader}>
            <div className={styles.headerTitleGroup}>
                <h2 className={styles.subtitle} style={{marginBottom:0, border:'none'}}>Historial</h2>
                {loading && <span className={styles.loader}>Actualizando...</span>}
            </div>
            <div className={styles.filterBar}>
                
                {/* --- 5. UI: SELECTOR DE CATEGORÍA --- */}
                <div className={styles.selectWrapper}>
                    <Tag size={16} className={styles.iconSelect} />
                    <select 
                        value={filtroCategoria} 
                        onChange={(e) => setFiltroCategoria(e.target.value)} 
                        className={styles.selectFilter}
                        style={{minWidth: '150px'}}
                    >
                        <option value="todas">Todas las Categorías</option>
                        {categorias.map((cat) => (
                            <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                        ))}
                    </select>
                </div>
                {/* ----------------------------------- */}

                <div className={styles.selectWrapper}>
                    <Filter size={16} className={styles.iconSelect} />
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)} className={styles.selectFilter}>
                        <option value="hoy"> Hoy</option>
                        <option value="ayer"> Ayer</option>
                        <option value="7dias"> Últimos 7 días</option>
                        <option value="mes"> Este Mes</option>
                        <option value="historial"> Historial Mensual</option>
                    </select>
                </div>
                {filtroTipo === 'historial' && (
                    <div className={styles.selectWrapper}>
                        <Calendar size={16} className={styles.iconSelect} />
                        <input type="month" value={mesSeleccionado} onChange={(e) => setMesSeleccionado(e.target.value)} className={styles.selectFilter} />
                    </div>
                )}
            </div>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Total ({filtroTipo})</div>
            <div className={styles.summaryValue}>
                Q{totalPeriodo.toFixed(2)}
            </div>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Producto</th>
                    <th style={{textAlign: 'center'}}>Cant.</th>
                    <th>Total</th>
                    <th>Fecha y Hora </th>
                    <th style={{textAlign: 'center'}}>Acciones</th> 
                </tr>
                </thead>
                <tbody>
                {historial.length === 0 && !loading && (
                    <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>
                        {filtroCategoria !== 'todas' ? 'No hay ventas en esta categoría.' : 'No hay ventas.'}
                    </td></tr>
                )}
                
                {historial.map((mov: any) => (
                    <tr key={mov.id}>
                        <td>
                            <span style={{fontWeight: 600, color: '#f1f5f9'}}>
                                {mov.productos?.nombre || 'Producto eliminado'}
                            </span>
                        </td>
                        <td style={{textAlign: 'center'}}>
                            <span className={styles.badgeQty}>{mov.cantidad}</span>
                        </td>
                        <td className={styles.money}>
                            Q{((mov.precio_real_venta || 0) * (mov.cantidad || 1)).toFixed(2)}
                        </td>
                        <td className={styles.date}>
                            <div style={{fontSize:'0.85rem', color:'#e2e8f0'}}>
                                {new Date(mov.creado_en).toLocaleDateString()}
                            </div>
                            <div style={{fontSize:'0.75rem', color:'#94a3b8'}}>
                                {new Date(mov.creado_en).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                        </td>
                        <td style={{textAlign: 'center'}}>
                            <div style={{display:'flex', gap:'8px', justifyContent:'center'}}>
                                <EditSaleModal 
                                    venta={mov} 
                                    onUpdate={() => {
                                        cargarHistorial()
                                        getProductosParaVenta().then(setProductos)
                                    }} 
                                />
                                <button 
                                    onClick={() => handleDelete(mov.id)}
                                    style={{
                                        background:'rgba(239, 68, 68, 0.1)', color:'#f87171', border:'none',
                                        padding:'6px', borderRadius:'6px', cursor:'pointer'
                                    }}
                                    title="Eliminar Venta"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
'use client'
import { useState, useEffect } from 'react'
import { Calendar, Filter } from 'lucide-react'
import ClientSalesInterface from './ClientSalesInterface'
import { getProductosParaVenta, getHistorialFiltrado } from './actions'
import styles from './ventas.module.css'

export default function VentasPage() {
  // --- ESTADOS ---
  const [productos, setProductos] = useState<any[]>([])
  const [historial, setHistorial] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Filtros
  const [filtroTipo, setFiltroTipo] = useState('hoy') // 'hoy', 'ayer', '7dias', 'mes', 'historial'
  const [mesSeleccionado, setMesSeleccionado] = useState(new Date().toISOString().slice(0, 7))
  const [totalPeriodo, setTotalPeriodo] = useState(0)

  // 1. Cargar productos disponibles (Solo una vez al inicio)
  useEffect(() => {
    getProductosParaVenta().then(data => setProductos(data || []))
  }, [])

  // 2. Función para cargar historial según filtros
  const cargarHistorial = async () => {
    setLoading(true)
    const ahora = new Date()
    let inicio = new Date()
    let fin = new Date()

    // Configurar el final del día
    fin.setHours(23, 59, 59, 999)

    switch (filtroTipo) {
      case 'hoy':
        inicio.setHours(0, 0, 0, 0)
        break
      case 'ayer':
        inicio.setDate(ahora.getDate() - 1)
        inicio.setHours(0, 0, 0, 0)
        fin.setDate(ahora.getDate() - 1)
        fin.setHours(23, 59, 59, 999)
        break
      case '7dias':
        inicio.setDate(ahora.getDate() - 7)
        inicio.setHours(0, 0, 0, 0)
        break
      case 'mes':
        inicio.setDate(1) // Primer día del mes
        inicio.setHours(0, 0, 0, 0)
        break
      case 'historial':
        const [year, month] = mesSeleccionado.split('-')
        inicio = new Date(parseInt(year), parseInt(month) - 1, 1)
        fin = new Date(parseInt(year), parseInt(month), 0)
        fin.setHours(23, 59, 59, 999)
        break
    }

    // Llamada a la Server Action
    const data = await getHistorialFiltrado(inicio.toISOString(), fin.toISOString())
    setHistorial(data || [])

    // Calcular total vendido en el periodo (Suma de precio_real_venta * cantidad)
    const total = data?.reduce((acc: number, mov: any) => {
      return acc + ((mov.precio_real_venta || 0) * (mov.cantidad || 1))
    }, 0) || 0
    setTotalPeriodo(total)

    setLoading(false)
  }

  // Recargar historial cuando cambie el filtro
  useEffect(() => {
    cargarHistorial()
  }, [filtroTipo, mesSeleccionado])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Punto de Venta</h1>
      
      <div className={styles.grid}>
        
        {/* PANEL IZQUIERDO: Registrar Venta (Tu componente original) */}
        <div className={styles.panel}>
            {/* Pasamos una función para recargar el historial al completar una venta */}
            <ClientSalesInterface 
                productos={productos} 
                onVentaCompletada={() => {
                    cargarHistorial()
                    getProductosParaVenta().then(setProductos) // Actualizar stock
                }}
            />
        </div>

        {/* PANEL DERECHO: Historial con Filtros */}
        <div className={styles.panel}>
          
          {/* Header del Historial */}
          <div className={styles.historyHeader}>
            <div className={styles.headerTitleGroup}>
                <h2 className={styles.subtitle} style={{marginBottom:0, border:'none'}}>Historial</h2>
                {loading && <span className={styles.loader}>Actualizando...</span>}
            </div>

            {/* Selector de Filtros */}
            <div className={styles.filterBar}>
                <div className={styles.selectWrapper}>
                    <Filter size={16} className={styles.iconSelect} />
                    <select 
                        value={filtroTipo} 
                        onChange={(e) => setFiltroTipo(e.target.value)}
                        className={styles.selectFilter}
                    >
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
                        <input 
                            type="month" 
                            value={mesSeleccionado}
                            onChange={(e) => setMesSeleccionado(e.target.value)}
                            className={styles.selectFilter}
                        />
                    </div>
                )}
            </div>
          </div>

          {/* Tarjeta de Total del Periodo */}
          <div className={styles.summaryCard}>
            <div className={styles.summaryLabel}>Total ({filtroTipo})</div>
            <div className={styles.summaryValue}>
                Q{totalPeriodo.toFixed(2)}
            </div>
          </div>

          {/* Tabla de Resultados */}
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
                <thead>
                <tr>
                    <th>Producto</th>
                    <th style={{textAlign: 'center'}}>Cant.</th>
                    <th>Total</th>
                    <th style={{textAlign: 'right'}}>Hora</th>
                </tr>
                </thead>
                <tbody>
                {historial.length === 0 && !loading && (
                    <tr>
                        <td colSpan={4} style={{textAlign: 'center', padding: '2rem', color: '#64748b'}}>
                            No hay ventas en este periodo.
                        </td>
                    </tr>
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
                            {new Date(mov.creado_en).toLocaleDateString()} <br/>
                            {new Date(mov.creado_en).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
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
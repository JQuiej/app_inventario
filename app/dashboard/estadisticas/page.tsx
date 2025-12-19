'use client'
import { useState, useEffect } from 'react'
import { getStatsData } from './actions'
import StatsChart from './StatsChart'
import { Filter, Calendar, TrendingUp, TrendingDown, DollarSign, PieChart, ShoppingCart, Wrench } from 'lucide-react'
import styles from './estadisticas.module.css' // <--- IMPORTAMOS ESTILOS

// Utilidades para fechas
const MESES = [
  { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
  { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
  { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
  { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
]

const CURRENT_YEAR = new Date().getFullYear()
// Generamos años dinámicos (Año actual + 1 futuro + 2 pasados)
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default function EstadisticasPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [activeTab, setActiveTab] = useState<'general' | 'ventas' | 'reparaciones'>('general')
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getStatsData(month, year).then(res => {
      setData(res)
      setLoading(false)
    })
  }, [month, year])

  const currentFinances = data?.financials[activeTab === 'general' ? 'total' : activeTab] || { ingresos: 0, costos: 0, ganancia: 0 }

  return (
    <div className={styles.container}>
      
      {/* HEADER Y FILTROS */}
      <div className={styles.header}>
        <h1 className={styles.title}>Reportes</h1>
        
        <div className={styles.filters}>
          <div className={styles.selectWrapper}>
            <Calendar size={18} className={styles.iconInput} />
            <select 
              value={month} 
              onChange={(e) => setMonth(Number(e.target.value))}
              className={styles.select}
            >
              {MESES.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
            </select>
          </div>
          <div className={styles.selectWrapper}>
            <Filter size={18} className={styles.iconInput} />
            <select 
              value={year} 
              onChange={(e) => setYear(Number(e.target.value))}
              className={styles.select}
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* PESTAÑAS (TABS) */}
      <div className={styles.tabsContainer}>
        <button 
            onClick={() => setActiveTab('general')}
            className={`${styles.tabButton} ${activeTab === 'general' ? styles.tabActive : ''}`}
        >
            <PieChart size={18} /> General
        </button>
        <button 
            onClick={() => setActiveTab('ventas')}
            className={`${styles.tabButton} ${activeTab === 'ventas' ? styles.tabActive : ''}`}
        >
            <ShoppingCart size={18} /> Solo Ventas
        </button>
        <button 
            onClick={() => setActiveTab('reparaciones')}
            className={`${styles.tabButton} ${activeTab === 'reparaciones' ? styles.tabActive : ''}`}
        >
            <Wrench size={18} /> Solo Reparaciones
        </button>
      </div>

      {/* TARJETAS DE RESUMEN (GRID RESPONSIVE) */}
      <div className={styles.cardsGrid}>
        
        {/* INGRESOS */}
        <div className={styles.card}>
            <div className={styles.cardTitle}>
                <TrendingUp size={18} color="#3b82f6"/> 
                INGRESOS ({activeTab.toUpperCase()})
            </div>
            <div className={styles.cardValue}>
                Q{currentFinances.ingresos.toLocaleString('en-US', {minimumFractionDigits:2})}
            </div>
        </div>

        {/* COSTOS */}
        <div className={styles.card}>
            <div className={styles.cardTitle}>
                <TrendingDown size={18} color="#f87171"/> 
                COSTOS ({activeTab === 'general' ? 'Total' : activeTab === 'ventas' ? 'Inventario' : 'Repuestos'})
            </div>
            <div className={styles.cardValue} style={{color: '#f87171'}}>
                Q{currentFinances.costos.toLocaleString('en-US', {minimumFractionDigits:2})}
            </div>
        </div>

        {/* GANANCIA BRUTA */}
        <div className={`${styles.card} ${styles.cardProfit}`}>
            <div className={styles.cardTitle}>
                Q - GANANCIA BRUTA
            </div>
            <div className={styles.cardValue}>
                Q{currentFinances.ganancia.toLocaleString('en-US', {minimumFractionDigits:2})}
            </div>
        </div>
      </div>

{/* GRID DE GRÁFICAS */}
      <div className={styles.chartsGrid}>
        
        {/* GRÁFICA PRINCIPAL: Evolución por Día */}
        <div style={{gridColumn: '1 / -1'}}> {/* Opcional: Que ocupe todo el ancho si usas grid */}
            <StatsChart 
              // Seleccionamos los datos diarios según la pestaña activa
              data={data?.daily[activeTab === 'general' ? 'total' : activeTab] || []} 
              // Título dinámico
              // Si la gráfica es diaria, el título debería reflejarlo
              // Pero StatsChart recibe props, puedes cambiar el título o quitarlo del componente y ponerlo aquí
            />
        </div>

        {/* Si quieres mantener las gráficas de categorías antiguas abajo, puedes dejarlas aquí, 
            pero como StatsChart ahora es una gráfica de PUNTOS (AreaChart), 
            se ve mejor con datos de tiempo (daily). 
            
            Si quisieras ver categorías, necesitarías otro componente de gráfica de barras.
        */}
      </div>

    </div>
  )
}
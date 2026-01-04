'use client'
import { useState, useEffect, useTransition } from 'react'
import { getStatsData } from './actions'
import StatsChart from './StatsChart'
import { Filter, Calendar, TrendingUp, TrendingDown, PieChart, ShoppingCart, Wrench, DollarSign } from 'lucide-react'
import styles from './estadisticas.module.css'

// Utilidades para fechas
const MESES = [
  { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
  { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
  { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
  { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

export default function EstadisticasPage() {
  const [month, setMonth] = useState(new Date().getMonth() + 1)
  const [year, setYear] = useState(CURRENT_YEAR)
  const [activeTab, setActiveTab] = useState<'general' | 'ventas' | 'reparaciones'>('general')
  
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Estado para la Categoría (Afecta a todo ahora)
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  // Carga de datos (Ahora incluye selectedCategory)
  useEffect(() => {
    setLoading(true)
    startTransition(async () => {
        // Enviamos la categoría seleccionada al servidor
        const res = await getStatsData(month, year, selectedCategory)
        setData(res)
        setLoading(false)
    })
  }, [month, year, selectedCategory]) // <-- Se recarga si cambia la categoría

  // Lógica para filtrar visualmente la lista Top 5 (aunque los datos ya vienen calculados)
  const getFilteredTopProductsList = () => {
    if (!data?.topProducts) return []
    let products = data.topProducts
    if (selectedCategory !== 'Todas') {
        products = products.filter((p: any) => p.category === selectedCategory)
    }
    return products.slice(0, 5)
  }

  // Obtener categorías únicas para el selector (Basado en el TopProducts que trae todo)
  const availableCategories = data?.topProducts 
    ? Array.from(new Set(data.topProducts.map((p: any) => p.category))) as string[]
    : []

  const currentFinances = data?.financials?.[activeTab === 'general' ? 'total' : activeTab] || { ingresos: 0, costos: 0, ganancia: 0 }

  return (
    <div className={styles.container}>
      
      {/* HEADER Y FILTROS */}
      <div className={styles.header}>
        <h1 className={styles.title}>Reportes</h1>
        
        <div className={styles.filters}>
          
          {/* SELECTOR DE CATEGORÍA (NUEVO LUGAR) */}
          <div className={styles.selectWrapper} style={{minWidth: '180px'}}>
             <Filter size={18} className={styles.iconInput} />
             <select 
                value={selectedCategory} 
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={styles.select}
             >
                <option value="Todas">Todas las categorías</option>
                {availableCategories.map((cat: string) => (
                    <option key={cat} value={cat}>{cat}</option>
                ))}
             </select>
          </div>

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

      {loading || isPending ? (
          <div className="flex h-64 items-center justify-center text-slate-400">
             Calculando finanzas...
          </div>
      ) : (
        <>
            {/* TARJETAS DE RESUMEN (GRID RESPONSIVE) */}
            <div className={styles.cardsGrid}>
                
                {/* INGRESOS */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <TrendingUp size={18} color="#3b82f6"/> 
                        INGRESOS ({selectedCategory === 'Todas' ? 'TOTAL' : selectedCategory.toUpperCase()})
                    </div>
                    <div className={styles.cardValue}>
                        Q{currentFinances.ingresos.toLocaleString('en-US', {minimumFractionDigits:2})}
                    </div>
                </div>

                {/* COSTOS */}
                <div className={styles.card}>
                    <div className={styles.cardTitle}>
                        <TrendingDown size={18} color="#f87171"/> 
                        COSTOS
                    </div>
                    <div className={styles.cardValue} style={{color: '#f87171'}}>
                        Q{currentFinances.costos.toLocaleString('en-US', {minimumFractionDigits:2})}
                    </div>
                </div>

                {/* GANANCIA BRUTA */}
                <div className={`${styles.card} ${styles.cardProfit}`}>
                    <div className={styles.cardTitle}>
                        GANANCIA BRUTA
                    </div>
                    <div className={styles.cardValue}>
                        Q{currentFinances.ganancia.toLocaleString('en-US', {minimumFractionDigits:2})}
                    </div>
                </div>
            </div>

            {/* GRID DE GRÁFICAS */}
            <div className={styles.chartsGrid}>
                
                {/* GRÁFICA PRINCIPAL */}
                <div style={{gridColumn: '1 / -1'}}> 
                    <StatsChart 
                    data={data?.daily[activeTab === 'general' ? 'total' : activeTab] || []} 
                    />
                </div>

                {/* SECCIÓN TOP 5 PRODUCTOS */}
                {activeTab !== 'reparaciones' && (
                    <div style={{
                        gridColumn: '1 / -1',
                        backgroundColor: '#1e293b',
                        borderRadius: '12px',
                        border: '1px solid #334155',
                        padding: '1.5rem',
                        marginTop: '1rem'
                    }}>
                        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1rem'}}>
                            <h3 style={{fontSize:'1.1rem', fontWeight:'700', color:'#f8fafc', display:'flex', alignItems:'center', gap:'8px'}}>
                               Top 5 Productos: {selectedCategory}
                            </h3>
                        </div>

                        <div style={{display:'flex', flexDirection:'column', gap:'0.75rem'}}>
                            {getFilteredTopProductsList().length === 0 ? (
                                <p style={{color:'#64748b', textAlign:'center', padding:'1rem'}}>No hay ventas en esta categoría</p>
                            ) : (
                                getFilteredTopProductsList().map((prod: any, index: number) => (
                                    <div key={index} style={{
                                        display:'flex', justifyContent:'space-between', alignItems:'center',
                                        backgroundColor: index === 0 ? 'rgba(250, 204, 21, 0.1)' : 'rgba(51, 65, 85, 0.3)',
                                        padding:'0.75rem', borderRadius:'8px',
                                        border: index === 0 ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid #334155'
                                    }}>
                                        <div style={{display:'flex', alignItems:'center', gap:'12px'}}>
                                            <span style={{
                                                fontWeight:'800', fontSize:'1.2rem', width:'24px', textAlign:'center',
                                                color: index === 0 ? '#facc15' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569'
                                            }}>
                                                #{index + 1}
                                            </span>
                                            <div>
                                                <div style={{fontWeight:'600', color:'white'}}>{prod.name}</div>
                                                <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{prod.category}</div>
                                            </div>
                                        </div>
                                        <div style={{textAlign:'right'}}>
                                            <div style={{fontWeight:'700', color:'#38bdf8', fontSize:'1.1rem'}}>
                                                {prod.quantity} <span style={{fontSize:'0.8rem', fontWeight:'400', color:'#64748b'}}>unid.</span>
                                            </div>
                                            <div style={{fontSize:'0.75rem', color:'#34d399'}}>
                                                Q{prod.total.toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>
        </>
      )}
    </div>
  )
}
'use client'
import { useState, useEffect, useTransition } from 'react'
import { getStatsData, getStatsRango } from './actions'
import StatsChart from './StatsChart'
import { Filter, Calendar, TrendingUp, TrendingDown, PieChart, ShoppingCart, Wrench } from 'lucide-react'
import styles from './estadisticas.module.css'

const MESES = [
  { id: 1, nombre: 'Enero' }, { id: 2, nombre: 'Febrero' }, { id: 3, nombre: 'Marzo' },
  { id: 4, nombre: 'Abril' }, { id: 5, nombre: 'Mayo' }, { id: 6, nombre: 'Junio' },
  { id: 7, nombre: 'Julio' }, { id: 8, nombre: 'Agosto' }, { id: 9, nombre: 'Septiembre' },
  { id: 10, nombre: 'Octubre' }, { id: 11, nombre: 'Noviembre' }, { id: 12, nombre: 'Diciembre' }
]

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

// Rangos disponibles: etiqueta → cuántos meses atrás (null = todo)
const RANGOS = [
  { id: 'mes',  label: 'Este Mes'  },
  { id: '3m',   label: 'Últ. 3 M.' },
  { id: '6m',   label: 'Últ. 6 M.' },
  { id: '12m',  label: 'Últ. 12 M.'},
  { id: 'todo', label: 'Todo'       },
] as const

type RangoId = typeof RANGOS[number]['id']

function calcRango(id: RangoId): { desde: string; hasta: string } {
  const hasta = new Date()
  hasta.setHours(23, 59, 59, 999)

  if (id === 'todo') {
    return { desde: '2020-01-01T00:00:00.000Z', hasta: hasta.toISOString() }
  }
  const meses = id === '3m' ? 3 : id === '6m' ? 6 : 12
  const desde = new Date(hasta)
  desde.setMonth(desde.getMonth() - meses + 1)
  desde.setDate(1)
  desde.setHours(0, 0, 0, 0)
  return { desde: desde.toISOString(), hasta: hasta.toISOString() }
}

export default function EstadisticasPage() {
  const [month, setMonth]             = useState(new Date().getMonth() + 1)
  const [year, setYear]               = useState(CURRENT_YEAR)
  const [rangoId, setRangoId]         = useState<RangoId>('mes')
  const [activeTab, setActiveTab]     = useState<'general' | 'ventas' | 'reparaciones'>('general')
  const [selectedCategory, setSelectedCategory] = useState('Todas')

  const [data, setData]       = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setLoading(true)
    startTransition(async () => {
      let res
      if (rangoId === 'mes') {
        res = await getStatsData(month, year, selectedCategory)
      } else {
        const { desde, hasta } = calcRango(rangoId)
        res = await getStatsRango(desde, hasta, selectedCategory)
      }
      setData(res)
      setLoading(false)
    })
  }, [month, year, rangoId, selectedCategory])

  const getFilteredTopProductsList = () => {
    if (!data?.topProducts) return []
    let products = data.topProducts
    if (selectedCategory !== 'Todas') {
      products = products.filter((p: any) => p.category === selectedCategory)
    }
    return products.slice(0, 5)
  }

  const availableCategories = data?.topProducts
    ? Array.from(new Set(data.topProducts.map((p: any) => p.category))) as string[]
    : []

  const tabKey = activeTab === 'general' ? 'total' : activeTab
  const currentFinances = data?.financials?.[tabKey] || { ingresos: 0, costos: 0, ganancia: 0 }

  const chartLabel = rangoId === 'mes'
    ? `${MESES.find(m => m.id === month)?.nombre} ${year}`
    : RANGOS.find(r => r.id === rangoId)?.label

  return (
    <div className={styles.container}>

      {/* HEADER Y FILTROS */}
      <div className={styles.header}>
        <h1 className={styles.title}>Reportes</h1>

        <div className={styles.filters}>

          {/* Categoría */}
          <div className={styles.selectWrapper} style={{ minWidth: '180px' }}>
            <Filter size={18} className={styles.iconInput} />
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className={styles.select}
            >
              <option value="Todas">Todas las categorías</option>
              {availableCategories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Mes / Año — solo visible en modo "Este Mes" */}
          {rangoId === 'mes' && (
            <>
              <div className={styles.selectWrapper}>
                <Calendar size={18} className={styles.iconInput} />
                <select
                  value={month}
                  onChange={e => setMonth(Number(e.target.value))}
                  className={styles.select}
                >
                  {MESES.map(m => <option key={m.id} value={m.id}>{m.nombre}</option>)}
                </select>
              </div>
              <div className={styles.selectWrapper}>
                <select
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className={styles.select}
                >
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      {/* SELECTOR DE RANGO */}
      <div className={styles.rangoBar}>
        {RANGOS.map(r => (
          <button
            key={r.id}
            onClick={() => setRangoId(r.id)}
            className={`${styles.rangoBtn} ${rangoId === r.id ? styles.rangoBtnActive : ''}`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* PESTAÑAS */}
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
          {/* TARJETAS KPI */}
          <div className={styles.cardsGrid}>
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <TrendingUp size={18} color="#3b82f6" />
                INGRESOS ({selectedCategory === 'Todas' ? 'TOTAL' : selectedCategory.toUpperCase()})
              </div>
              <div className={styles.cardValue}>
                Q{currentFinances.ingresos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <TrendingDown size={18} color="#f87171" />
                COSTOS
              </div>
              <div className={styles.cardValue} style={{ color: '#f87171' }}>
                Q{currentFinances.costos.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className={`${styles.card} ${styles.cardProfit}`}>
              <div className={styles.cardTitle}>GANANCIA BRUTA</div>
              <div className={styles.cardValue}>
                Q{currentFinances.ganancia.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* GRÁFICA */}
          <div className={styles.chartsGrid}>
            <div style={{ gridColumn: '1 / -1' }}>
              <StatsChart
                data={data?.daily[tabKey] || []}
                titulo={`Resumen Financiero · ${chartLabel}`}
              />
            </div>

            {/* TOP 5 */}
            {activeTab !== 'reparaciones' && (
              <div style={{
                gridColumn: '1 / -1',
                backgroundColor: '#1e293b',
                borderRadius: '12px',
                border: '1px solid #334155',
                padding: '1.5rem',
                marginTop: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    Top 5 Productos: {selectedCategory}
                    <span style={{ fontSize: '0.75rem', fontWeight: 400, color: '#64748b' }}>
                      · {chartLabel}
                    </span>
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {getFilteredTopProductsList().length === 0 ? (
                    <p style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>
                      No hay ventas en esta categoría para el período seleccionado
                    </p>
                  ) : (
                    getFilteredTopProductsList().map((prod: any, index: number) => (
                      <div key={index} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        backgroundColor: index === 0 ? 'rgba(250, 204, 21, 0.1)' : 'rgba(51, 65, 85, 0.3)',
                        padding: '0.75rem', borderRadius: '8px',
                        border: index === 0 ? '1px solid rgba(250, 204, 21, 0.3)' : '1px solid #334155'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{
                            fontWeight: '800', fontSize: '1.2rem', width: '24px', textAlign: 'center',
                            color: index === 0 ? '#facc15' : index === 1 ? '#94a3b8' : index === 2 ? '#b45309' : '#475569'
                          }}>
                            #{index + 1}
                          </span>
                          <div>
                            <div style={{ fontWeight: '600', color: 'white' }}>{prod.name}</div>
                            <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{prod.category}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: '700', color: '#38bdf8', fontSize: '1.1rem' }}>
                            {prod.quantity} <span style={{ fontSize: '0.8rem', fontWeight: '400', color: '#64748b' }}>unid.</span>
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#34d399' }}>
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

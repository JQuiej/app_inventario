import { getStatsDiarios, getStockBajo, getChartData } from './actions'
import SalesChart from './SalesChart'
import { DollarSign, Package, TrendingUp, AlertTriangle } from 'lucide-react'
import styles from './dashboard.module.css'

export default async function DashboardPage() {
  // Cargamos todos los datos en paralelo para que sea más rápido
  const [stats, stockBajo, chartData] = await Promise.all([
    getStatsDiarios(),
    getStockBajo(),
    getChartData()
  ])

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard General</h1>

      {/* --- TARJETAS SUPERIORES --- */}
      <div className={styles.statsGrid}>
        
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Ventas de Hoy</span>
            <div className={`${styles.iconBox} ${styles.blueIcon}`}>
              Q
            </div>
          </div>
          <div className={styles.cardValue}>Q{stats.ventasHoy.toFixed(2)}</div>
          <div className={styles.cardSub}>Ingresos brutos del día</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Ganancia Estimada (Hoy)</span>
            <div className={`${styles.iconBox} ${styles.greenIcon}`}>
              <TrendingUp size={20} />
            </div>
          </div>
          <div className={`${styles.cardValue} ${styles.textGreen}`}>
            Q{stats.gananciaHoy.toFixed(2)}
          </div>
          <div className={styles.cardSub}>Base - Costo Promedio</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <span className={styles.cardLabel}>Productos Activos</span>
            <div className={`${styles.iconBox} ${styles.purpleIcon}`}>
              <Package size={20} />
            </div>
          </div>
          <div className={styles.cardValue}>{stats.totalProductos}</div>
          <div className={styles.cardSub}>En catálogo</div>
        </div>
      </div>

      {/* --- SECCIÓN INFERIOR (Gráfica y Alertas) --- */}
      <div className={styles.contentGrid}>
        
        {/* GRÁFICA MENSUAL */}
        <div className={styles.chartPanel}>
          <h2 className={styles.subtitle}>Comportamiento Mensual</h2>
          <SalesChart data={chartData} />
        </div>

      {/* Tarjeta de Stock Bajo */}
      <div className={styles.lowStockCard}>
        <div className={styles.cardHeader}>
          <h3 className={styles.cardTitle}>
            <AlertTriangle size={20} color="#f87171" />
            Stock Bajo
          </h3>
        </div>

        <div className={styles.lowStockList}>
          {stockBajo.length === 0 ? (
            <p style={{color: '#94a3b8', textAlign: 'center', padding: '1rem'}}>
              Todo en orden
            </p>
          ) : (
            stockBajo.map((prod) => (
              <div key={prod.id} className={styles.stockItem}>
                {/* Aplicamos la clase para cortar texto */}
                <span className={styles.productName} title={prod.nombre}>
                  {prod.nombre}
                </span>
                
                {/* El badge no se encogerá gracias a flex-shrink: 0 */}
                <span className={styles.stockBadge}>
                  {prod.stock_actual} uni.
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      </div>
    </div>
  )
}
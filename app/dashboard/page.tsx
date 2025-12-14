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

        {/* ALERTA DE STOCK BAJO */}
        <div className={styles.alertPanel}>
          <div className={styles.alertHeader}>
            <h2 className={styles.subtitle} style={{marginBottom:0}}>Stock Crítico</h2>
            <AlertTriangle size={18} color="#f59e0b" />
          </div>
          
          <div className={styles.stockList}>
            {stockBajo.length === 0 ? (
                <div style={{padding:'1rem', color:'#94a3b8', fontSize:'0.9rem'}}>
                    Todo en orden. No hay stock bajo.
                </div>
            ) : (
                stockBajo.map((prod: any) => (
                <div key={prod.id} className={styles.stockItem}>
                    <div>
                    <div className={styles.stockName}>{prod.nombre}</div>
                    </div>
                    <div className={styles.stockBadge}>
                    Queda: {prod.stock_actual}
                    </div>
                </div>
                ))
            )}
          </div>
          {stockBajo.length > 0 && (
              <div className={styles.alertFooter}>
                  ⚠️ Requieren reabastecimiento urgente
              </div>
          )}
        </div>

      </div>
    </div>
  )
}
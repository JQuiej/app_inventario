import { getEstadisticas } from '@/actions/inventario'
import styles from './page.module.css'

export default async function DashboardPage() {
  const stats = await getEstadisticas()

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      <div className={styles.statsGrid}>
        {/* Tarjeta de Ventas */}
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Ventas Totales</h3>
          <p className={`${styles.statValue} ${styles.salesValue}`}>Q{stats.totalVendido.toFixed(2)}</p>
        </div>
        
        {/* Tarjeta de Productos */}
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Productos en Catálogo</h3>
          <p className={styles.statValue}>{stats.totalProductos}</p>
        </div>
      </div>
    </div>
  )
}
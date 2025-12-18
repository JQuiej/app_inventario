'use client'
import { useState, useEffect, useTransition } from 'react' // <--- Importamos useTransition
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FolderTree, LogOut, Menu, X, ShoppingCart, Wrench, BarChart3, Loader2 } from 'lucide-react'
import styles from '@/app/dashboard/layout.module.css'
import { logout } from '@/app/login/actions'

interface SidebarProps {
  userEmail: string;
  businessName: string;
  userRole: string;
}

export default function Sidebar({ userEmail, businessName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [loadingPath, setLoadingPath] = useState<string | null>(null)
  
  // --- ESTADO PARA EL LOGOUT ---
  const [isLoggingOut, startLogoutTransition] = useTransition() 

  const toggleMenu = () => setIsOpen(!isOpen)

  // Efecto: Cuando la ruta cambia REALMENTE, quitamos el loading de navegación
  useEffect(() => {
    setLoadingPath(null)
    setIsOpen(false)
  }, [pathname])

  const handleLinkClick = (path: string) => {
    if (pathname !== path) {
      setLoadingPath(path)
    }
    setIsOpen(false)
  }

  // --- FUNCIÓN DE LOGOUT CON TRANSICIÓN ---
  const handleLogout = () => {
    startLogoutTransition(async () => {
      await logout()
    })
  }

  const esTecnico = userRole === 'tecnico'

  return (
    <>
      <header className={styles.mobileHeader}>
        <span className={styles.brand}>{businessName}</span>
        <button onClick={toggleMenu} className={styles.menuBtn}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      <div className={isOpen ? styles.overlayOpen : styles.overlay} onClick={() => setIsOpen(false)} />

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.brand}>{businessName}</h2>
          <p className={styles.userEmail}>{userEmail}</p>
          {esTecnico && <span style={{fontSize:'0.7rem', background:'#3b82f6', padding:'2px 6px', borderRadius:'4px', marginTop:'4px', display:'inline-block'}}>MODO TÉCNICO</span>}
        </div>
        
        <nav className={styles.nav}>
          
          {!esTecnico && (
            <>
              <Link 
                href="/dashboard" 
                className={styles.navLink} 
                onClick={() => handleLinkClick('/dashboard')}
                style={pathname === '/dashboard' ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
              >
                {loadingPath === '/dashboard' ? <Loader2 className="animate-spin" size={20} /> : <LayoutDashboard size={20} />}
                <span>Dashboard</span>
              </Link>

              <Link 
                href="/dashboard/inventario/categorias" 
                className={styles.navLink} 
                onClick={() => handleLinkClick('/dashboard/inventario/categorias')}
                style={pathname.includes('/dashboard/inventario') ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
              >
                {loadingPath === '/dashboard/inventario/categorias' ? <Loader2 className="animate-spin" size={20} /> : <FolderTree size={20} />}
                <span>Inventario</span>
              </Link>

              <Link 
                href="/dashboard/ventas" 
                className={styles.navLink} 
                onClick={() => handleLinkClick('/dashboard/ventas')}
                style={pathname.includes('/dashboard/ventas') ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
              >
                {loadingPath === '/dashboard/ventas' ? <Loader2 className="animate-spin" size={20} /> : <ShoppingCart size={20} />}
                <span>Ventas</span>
              </Link>

              <Link 
                href="/dashboard/estadisticas" 
                className={styles.navLink} 
                onClick={() => handleLinkClick('/dashboard/estadisticas')}
                style={pathname.includes('/dashboard/estadisticas') ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
              >
                {loadingPath === '/dashboard/estadisticas' ? <Loader2 className="animate-spin" size={20} /> : <BarChart3 size={20} />}
                <span>Estadísticas</span>
              </Link>
            </>
          )}

          <Link 
            href="/dashboard/reparaciones" 
            className={styles.navLink} 
            onClick={() => handleLinkClick('/dashboard/reparaciones')}
            style={pathname.includes('/dashboard/reparaciones') ? { backgroundColor: 'rgba(255,255,255,0.1)' } : {}}
          >
            {loadingPath === '/dashboard/reparaciones' ? <Loader2 className="animate-spin" size={20} /> : <Wrench size={20} />}
            <span>Reparaciones</span>
          </Link>
        </nav>

        <div className={styles.footer}>
          <button 
            onClick={handleLogout} 
            className={styles.logoutBtn}
            disabled={isLoggingOut} // Bloquear botón mientras sale
            style={{ opacity: isLoggingOut ? 0.7 : 1 }}
          >
            {isLoggingOut ? (
              <>
                <Loader2 className="animate-spin" size={20} />
                <span>Cerrando...</span>
              </>
            ) : (
              <>
                <LogOut size={20} />
                <span>Cerrar Sesión</span>
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  )
}
'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, FolderTree, LogOut, Menu, X, ShoppingCart, Wrench, BarChart3 } from 'lucide-react'
import styles from '@/app/dashboard/layout.module.css'
import { logout } from '@/app/login/actions'

interface SidebarProps {
  userEmail: string;
  businessName: string;
  userRole: string; // <--- Nueva prop
}

export default function Sidebar({ userEmail, businessName, userRole }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)
  const toggleMenu = () => setIsOpen(!isOpen)

  // Si es técnico, solo ve Taller. Si es admin, ve todo.
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
          
          {/* Solo mostramos estos si NO es técnico */}
          {!esTecnico && (
            <>
              <Link href="/dashboard" className={styles.navLink} onClick={() => setIsOpen(false)}>
                <LayoutDashboard size={20} />
                <span>Dashboard</span>
              </Link>
              <Link href="/dashboard/inventario/categorias" className={styles.navLink} onClick={() => setIsOpen(false)}>
                <FolderTree size={20} />
                <span>Inventario</span>
              </Link>
              <Link href="/dashboard/ventas" className={styles.navLink} onClick={() => setIsOpen(false)}>
                <ShoppingCart size={20} />
                <span>Ventas</span>
              </Link>
              <Link href="/dashboard/estadisticas" className={styles.navLink} onClick={() => setIsOpen(false)}>
                <BarChart3 size={20} />
                <span>Estadísticas</span>
              </Link>
            </>
          )}

          {/* Este lo ven todos */}
          <Link href="/dashboard/reparaciones" className={styles.navLink} onClick={() => setIsOpen(false)}>
            <Wrench size={20} />
            <span>Reparaciones</span>
          </Link>
        </nav>

        <div className={styles.footer}>
          {/* Usamos el botón directamente con onClick para llamar a la Server Action */}
          <button 
            onClick={() => logout()} 
            className={styles.logoutBtn}
          >
            <LogOut size={20} />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  )
}
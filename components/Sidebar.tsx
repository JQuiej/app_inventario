'use client'
import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, FolderTree, LogOut, Menu, X, ShoppingCart } from 'lucide-react'
import styles from '@/app/dashboard/layout.module.css'

interface SidebarProps {
  userEmail: string;
  businessName: string;
}

export default function Sidebar({ userEmail, businessName }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)

  return (
    <>
      {/* Header Móvil (Solo visible en pantallas pequeñas) */}
      <header className={styles.mobileHeader}>
        <span className={styles.brand}>{businessName || 'Mi Negocio'}</span>
        <button onClick={toggleMenu} className={styles.menuBtn}>
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* Overlay Oscuro (Fondo al abrir menú en móvil) */}
      <div 
        className={isOpen ? styles.overlayOpen : styles.overlay} 
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar Principal */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.brand}>{businessName || 'Inventario'}</h2>
          <p className={styles.userEmail}>{userEmail}</p>
        </div>
        
        <nav className={styles.nav}>
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
        </nav>

        <div className={styles.footer}>
          <form action="/login" method="post">
            <button className={styles.logoutBtn}>
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>
    </>
  )
}
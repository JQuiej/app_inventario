import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar' // Asegúrate de la ruta correcta
import styles from './layout.module.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  
  // 1. Obtener usuario
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // 2. Obtener perfil del negocio
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name')
    .eq('id', user.id)
    .single()

  return (
    <div className={styles.container}>
      {/* 3. Pasar el nombre al componente */}
      <Sidebar 
        userEmail={user.email || ''} 
        businessName={profile?.business_name || 'Mi Negocio'} 
      />

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
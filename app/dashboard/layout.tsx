import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar' 
import styles from './layout.module.css'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  // Obtener perfil COMPLETO (rol y nombre)
  const { data: profile } = await supabase
    .from('profiles')
    .select('business_name, role') // <--- Agregamos 'role'
    .eq('id', user.id)
    .single()

  return (
    <div className={styles.container}>
      <Sidebar 
        userEmail={user.email || ''} 
        businessName={profile?.business_name || 'Mi Negocio'}
        userRole={profile?.role || 'admin'} // <--- Pasamos el rol
      />

      <main className={styles.main}>
        {children}
      </main>
    </div>
  )
}
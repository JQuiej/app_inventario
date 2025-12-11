import Link from 'next/link'
import { Package, LayoutDashboard, FolderTree, LogOut } from 'lucide-react'
import { createClient } from '../../utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col fixed h-full">
        <div className="p-6 border-b border-slate-800">
          <h2 className="text-xl font-bold tracking-tight">Mi Negocio</h2>
          <p className="text-xs text-slate-400 mt-1 truncate">{user.email}</p>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavLink href="/dashboard/categorias" icon={<FolderTree size={20} />} label="Categorías & Productos" />
        </nav>

        <div className="p-4 border-t border-slate-800">
          <form action="/auth/signout" method="post">
            <button className="flex items-center gap-3 text-slate-400 hover:text-white transition w-full p-2 rounded-lg hover:bg-slate-800">
              <LogOut size={20} />
              <span>Cerrar Sesión</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-64 p-8">
        {children}
      </main>
    </div>
  )
}

function NavLink({ href, icon, label }: { href: string, icon: React.ReactNode, label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg transition">
      {icon}
      <span className="font-medium">{label}</span>
    </Link>
  )
}
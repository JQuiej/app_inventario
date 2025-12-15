'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'

// Colores bonitos para las barras
const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1']

export default function StatsChart({ data, title, total }: { data: any[], title: string, total: number }) {
  if (data.length === 0) {
    return (
      <div style={{
        background: '#1e293b', borderRadius: '12px', padding: '2rem', 
        border: '1px solid #334155', height: '350px', display: 'flex', 
        alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
      }}>
        <h3 style={{color:'#f8fafc', marginBottom:'0.5rem'}}>{title}</h3>
        <p style={{color:'#64748b'}}>No hay datos en este periodo.</p>
      </div>
    )
  }

  return (
    <div style={{
      background: '#1e293b', borderRadius: '12px', padding: '1.5rem', 
      border: '1px solid #334155', height: '100%', minHeight: '400px',
      display:'flex', flexDirection:'column'
    }}>
      <div style={{display:'flex', justifyContent:'space-between', marginBottom:'1.5rem'}}>
        <h3 style={{color:'#f8fafc', fontSize:'1.1rem', margin:0}}>{title}</h3>
        <span style={{color:'#34d399', fontWeight:'bold', fontSize:'1.1rem'}}>Q{total.toFixed(2)}</span>
      </div>

      <div style={{flex:1, width: '100%', minHeight: '300px'}}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart layout="vertical" data={data} margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
            <XAxis type="number" stroke="#94a3b8" tickFormatter={(val) => `Q${val}`} />
            <YAxis dataKey="name" type="category" stroke="#f8fafc" width={100} style={{fontSize:'0.8rem'}} />
            <Tooltip 
              cursor={{fill: 'rgba(255,255,255,0.05)'}}
              contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
              formatter={(value: number) => [`Q${value.toFixed(2)}`, 'Ingreso']}
            />
            <Bar dataKey="total" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
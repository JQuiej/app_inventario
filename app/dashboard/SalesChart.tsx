'use client'
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  CartesianGrid 
} from 'recharts'

export default function SalesChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div style={{
        height: '300px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        color: '#64748b',
        border: '1px solid #334155',
        borderRadius: '12px',
        backgroundColor: 'rgba(30, 41, 59, 0.5)'
      }}>
        No hay datos de ventas este mes.
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          
          {/* DEFINICIÓN DEL DEGRADADO */}
          <defs>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>

          {/* GRID MINIMALISTA */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke="#334155" 
            vertical={false} 
            opacity={0.5} 
          />

          {/* EJES */}
          <XAxis 
            dataKey="name" 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            dy={10}
          />
          <YAxis 
            stroke="#94a3b8" 
            fontSize={12} 
            tickLine={false} 
            axisLine={false} 
            tickFormatter={(value) => `Q${value}`} 
          />

          {/* TOOLTIP ESTILIZADO */}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              border: '1px solid #334155', 
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            itemStyle={{ color: '#60a5fa' }}
            formatter={(value: number) => [`Q${value.toFixed(2)}`, 'Ventas']}
            labelStyle={{ color: '#94a3b8' }}
          />

          {/* ÁREA Y PUNTOS */}
          <Area 
            type="monotone" 
            dataKey="total" 
            stroke="#3b82f6" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#salesGradient)" 
            
            // Puntos personalizados
            dot={{ 
              r: 4, 
              fill: '#0f172a', 
              stroke: '#3b82f6', 
              strokeWidth: 2 
            }}
            activeDot={{ 
              r: 6, 
              fill: '#3b82f6', 
              stroke: '#fff',
              strokeWidth: 2
            }}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
'use client'

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts'

export default function StatsChart({ data }: { data: any[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[300px] w-full items-center justify-center rounded-lg border border-slate-800 bg-slate-900/50 text-slate-400">
        No hay datos suficientes para la gráfica
      </div>
    )
  }

  return (
    <div className="h-[350px] w-full rounded-xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
      <h3 className="mb-6 text-lg font-semibold text-slate-200">Resumen Financiero</h3>
      
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          
          {/* DEFINICIÓN DEL DEGRADADO */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
            </linearGradient>
          </defs>

          {/* GRID */}
          <CartesianGrid 
            strokeDasharray="3 3" 
            vertical={false} 
            stroke="#334155" 
            opacity={0.5} 
          />

          {/* EJES */}
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            dy={10} 
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }} 
            tickFormatter={(value) => `Q${value+800}`} 
          />

          {/* TOOLTIP */}
          <Tooltip 
            contentStyle={{ 
              backgroundColor: '#0f172a', 
              borderColor: '#334155', 
              borderRadius: '8px', 
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
            }}
            itemStyle={{ color: '#60a5fa' }} // Color del texto del valor
            formatter={(value: number) => [`Q${value.toFixed(2)}`, 'Total']}
            labelStyle={{ color: '#94a3b8' }}
          />

          {/* ÁREA Y PUNTOS */}
          <Area 
            type="monotone" // Línea curva suave
            dataKey="total" 
            stroke="#3b82f6" // Color de la línea
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#areaGradient)" // Relleno degradado
            
            // CONFIGURACIÓN DE LOS PUNTOS
            dot={{ 
              r: 4, 
              fill: '#0f172a', // Centro oscuro
              stroke: '#3b82f6', // Borde azul
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
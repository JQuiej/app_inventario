'use client'
import { useRef, useState } from 'react'
import { Pencil } from 'lucide-react'
import { toast } from 'sonner'
import { actualizarVenta } from './actions'

export default function EditSaleModal({ venta, onUpdate }: { venta: any, onUpdate: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [cantidad, setCantidad] = useState(venta.cantidad)
  const [precio, setPrecio] = useState(venta.precio_real_venta)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await actualizarVenta(venta.id, Number(cantidad), Number(precio))
      toast.success('Venta actualizada')
      onUpdate()
      dialogRef.current?.close()
    } catch (error: any) {
      toast.error(error.message || 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  // Estilos inline para mantener consistencia con tu theme oscuro sin crear otro CSS module
  const inputStyle = {
    width: '100%', padding: '0.75rem', backgroundColor: '#0f172a',
    border: '1px solid #334155', borderRadius: '8px', color: 'white', fontSize: '1rem',
    marginTop: '0.5rem'
  }

  return (
    <>
      <button 
        onClick={() => dialogRef.current?.showModal()}
        style={{
            background: 'rgba(59, 130, 246, 0.1)', color: '#60a5fa', border:'none',
            padding:'6px', borderRadius:'6px', cursor:'pointer'
        }}
        title="Editar Venta"
      >
        <Pencil size={16} />
      </button>

      <dialog ref={dialogRef} style={{
          border:'none', borderRadius:'16px', padding:'0', 
          boxShadow:'0 25px 50px -12px rgba(0,0,0,0.5)', width:'400px', background:'transparent'
      }}>
        <div style={{backgroundColor:'#1e293b', padding:'2rem', color:'white', display:'flex', flexDirection:'column', gap:'1.5rem'}}>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #334155', paddingBottom:'1rem'}}>
            <h3 style={{margin:0, fontSize:'1.25rem'}}>Editar Venta</h3>
            <button onClick={() => dialogRef.current?.close()} style={{background:'none', border:'none', color:'#94a3b8', fontSize:'1.5rem', cursor:'pointer'}}>×</button>
          </div>

          <div style={{backgroundColor:'rgba(59, 130, 246, 0.1)', padding:'1rem', borderRadius:'8px', borderLeft:'4px solid #3b82f6'}}>
            <div style={{fontSize:'0.8rem', color:'#94a3b8', textTransform:'uppercase'}}>Producto</div>
            <div style={{fontWeight:'bold', fontSize:'1.1rem'}}>{venta.productos?.nombre}</div>
          </div>

          <form onSubmit={handleSubmit} style={{display:'flex', flexDirection:'column', gap:'1rem'}}>
            <div>
              <label style={{fontSize:'0.9rem', color:'#cbd5e1', fontWeight:600}}>Cantidad</label>
              <input 
                type="number" min="1"
                value={cantidad} 
                onChange={(e) => setCantidad(e.target.value)} 
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{fontSize:'0.9rem', color:'#cbd5e1', fontWeight:600}}>Precio Unitario (Q)</label>
              <input 
                type="number" step="0.01"
                value={precio} 
                onChange={(e) => setPrecio(e.target.value)} 
                style={inputStyle}
              />
            </div>

            <div style={{marginTop:'1rem', paddingTop:'1rem', borderTop:'1px dashed #475569', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{color:'#94a3b8'}}>Nuevo Total:</span>
                <span style={{fontSize:'1.5rem', fontWeight:'bold', color:'#34d399'}}>
                    Q{((Number(cantidad) || 0) * (Number(precio) || 0)).toFixed(2)}
                </span>
            </div>

            <button type="submit" disabled={loading} style={{
                backgroundColor:'#3b82f6', color:'white', padding:'1rem', border:'none',
                borderRadius:'8px', fontWeight:700, cursor:'pointer', marginTop:'0.5rem',
                opacity: loading ? 0.7 : 1
            }}>
              {loading ? 'Guardando...' : 'Confirmar Cambios'}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}
'use client'
import { useState, useEffect, useRef } from 'react'
import { Plus, Pencil, Trash2, RefreshCcw, Phone, Search, Filter, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { getReparaciones, crearReparacion, actualizarEstado, eliminarReparacion, editarReparacion } from './actions'
import styles from './reparaciones.module.css'

// CATEGORÍAS DEFINIDAS
const CATEGORIAS_REPARACION = [
  "Pantalla",
  "Placa de carga",
  "Batería",
  "Liberación",
  "FRP / Cuenta Google",
  "Formateo / Software",
  "Limpieza / Mantenimiento",
  "Otra"
]

export default function ReparacionesPage() {
  const [reparaciones, setReparaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // --- ESTADOS DE FILTRO ---
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Pendiente')

  const cargarDatos = async () => {
    setLoading(true)
    const data = await getReparaciones()
    setReparaciones(data)
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  // --- LÓGICA DE FILTRADO ---
  const reparacionesFiltradas = reparaciones.filter(rep => {
    const texto = busqueda.toLowerCase()
    const coincideTexto = 
        rep.cliente_nombre.toLowerCase().includes(texto) ||
        rep.dispositivo.toLowerCase().includes(texto) ||
        rep.cliente_telefono?.includes(texto)
    
    const coincideEstado = filtroEstado === 'Todos' || rep.estado === filtroEstado
    return coincideTexto && coincideEstado
  })

  // --- CONTACTO ---
  const handleContactar = (nombre: string, telefono: string) => {
    if (!telefono) return toast.error("Sin teléfono registrado")
    const numLimpio = telefono.replace(/\D/g, '') 
    const numWhatsapp = numLimpio.length === 8 ? `502${numLimpio}` : numLimpio

    toast.custom((t) => (
      <div className={styles.contactToast}>
        <div style={{fontWeight: 'bold', marginBottom:'0.5rem'}}>Contactar a {nombre}</div>
        <div className={styles.contactActions}>
            <button onClick={() => { window.open(`https://wa.me/${numWhatsapp}`, '_blank'); toast.dismiss(t) }} className={styles.btnWhatsapp}>WhatsApp</button>
            <button onClick={() => { window.open(`tel:${numLimpio}`); toast.dismiss(t) }} className={styles.btnCall}>Llamar</button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  const handleDelete = (id: string) => {
    toast('¿Eliminar registro?', {
      action: { label: 'Eliminar', onClick: async () => { await eliminarReparacion(id); cargarDatos(); toast.success('Eliminado') } },
      cancel: { 
        label: 'Cancelar',
        onClick: () => {}
      },
      actionButtonStyle: { backgroundColor: '#ef4444' }
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Reparaciones</h1>
        
        <div className={styles.controls}>
            <div className={styles.searchWrapper}>
                <Search className={styles.searchIcon} size={18} />
                <input type="text" placeholder="Buscar..." className={styles.searchInput} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
            </div>
            <div className={styles.selectWrapper}>
                <Filter className={styles.searchIcon} size={18} />
                <select className={styles.statusFilter} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                    <option value="Pendiente">🟡 Pendientes</option>
                    <option value="Reparado">🟢 Reparados</option>
                    <option value="Sin Solución">🔴 Sin Solución</option>
                    <option value="Entregado">⚪ Entregados</option>
                    <option value="Todos">📂 Todos</option>
                </select>
            </div>
            <NewRepairModal onSave={cargarDatos} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cliente / Equipo</th>
                <th>Falla / Categoría</th>
                <th>Estado</th>
                <th style={{textAlign:'right'}}>Costo Reparacion</th>
                <th style={{textAlign:'right'}}>Cobro Final</th>
                <th style={{textAlign:'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{padding:'2rem', textAlign:'center'}}>Cargando...</td></tr>}
              {!loading && reparacionesFiltradas.length === 0 && (
                <tr><td colSpan={6} style={{padding:'2rem', textAlign:'center', color:'#94a3b8'}}>No se encontraron datos.</td></tr>
              )}

              {reparacionesFiltradas.map((rep) => (
                <tr key={rep.id}>
                  <td>
                    <div style={{fontWeight:'bold', color:'white'}}>{rep.cliente_nombre}</div>
                    <div style={{fontSize:'0.8rem', color:'#94a3b8'}}>{rep.dispositivo}</div>
                  </td>
                  <td>
                    <span style={{fontSize:'0.75rem', background:'#334155', padding:'2px 6px', borderRadius:'4px', color:'#cbd5e1'}}>
                        {rep.categoria || 'Otra'}
                    </span>
                    <div style={{fontSize:'0.9rem', marginTop:'4px'}}>{rep.falla}</div>
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles['status' + rep.estado.replace(' ', '')]}`}>
                      {rep.estado}
                    </span>
                  </td>
                  <td style={{textAlign:'right', color:'#94a3b8'}}>Q{rep.cotizacion}</td>
                  <td style={{textAlign:'right'}}>
                    {rep.precio > 0 ? (
                        <div>
                            <div style={{color:'#34d399', fontWeight:'bold'}}>Q{rep.precio}</div>
                            {rep.comision > 0 && (
                                <div style={{fontSize:'0.7rem', color:'#f87171'}} title="Comisión descontada">
                                    - Q{rep.comision}
                                </div>
                            )}
                        </div>
                    ) : <span style={{color:'#64748b'}}>-</span>}
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => handleContactar(rep.cliente_nombre, rep.cliente_telefono)} className={`${styles.iconBtn} ${styles.btnContact}`}>
                        <Phone size={16} />
                      </button>
                      <StatusModal reparacion={rep} onUpdate={cargarDatos} />
                      <EditRepairModal reparacion={rep} onUpdate={cargarDatos} />
                      <button onClick={() => handleDelete(rep.id)} className={`${styles.iconBtn} ${styles.btnDelete}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// --- MODAL: NUEVO INGRESO ---
function NewRepairModal({ onSave }: { onSave: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()} className={styles.btnPrimary}>
        <Plus size={18} /> Ingreso
      </button>
      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Nuevo Ingreso</h3>
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton}>×</button>
          </div>
          <form action={async (fd) => {
            await crearReparacion(fd)
            onSave()
            dialogRef.current?.close()
            toast.success("Ingreso registrado")
          }} className={styles.formGrid}>
            
            <div className={styles.formGroup}>
              <label className={styles.label}>Cliente</label>
              <input name="cliente_nombre" className={styles.input} required placeholder="Nombre completo" />
            </div>
            
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Teléfono</label>
                    <input name="cliente_telefono" className={styles.input} placeholder="5555-5555" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Categoría</label>
                    <select name="categoria" className={styles.select}>
                        {CATEGORIAS_REPARACION.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Dispositivo</label>
              <input name="dispositivo" className={styles.input} required placeholder="Marca y Modelo" />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.label}>Falla Reportada</label>
              <textarea name="falla" className={styles.textarea} required />
            </div>

            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Costo Reparacion (Q)</label>
                    <input name="cotizacion" type="number" step="0.01" className={styles.input} placeholder="0.00" />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Precio Final (Q)</label>
                    <input name="precio" type="number" step="0.01" className={styles.input} placeholder="Opcional" />
                </div>
            </div>

            <button type="submit" className={styles.submitButton}>Registrar</button>
          </form>
        </div>
      </dialog>
    </>
  )
}

// --- MODAL: EDITAR INFORMACIÓN (FINANZAS) ---
function EditRepairModal({ reparacion, onUpdate }: { reparacion: any, onUpdate: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null)
  
    return (
      <>
        <button onClick={() => dialogRef.current?.showModal()} className={`${styles.iconBtn} ${styles.btnEdit}`} title="Editar / Cobrar">
          <Pencil size={16} />
        </button>
        <dialog ref={dialogRef} className={styles.dialog}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Editar / Finalizar Cobro</h3>
              <button onClick={() => dialogRef.current?.close()} className={styles.closeButton}>×</button>
            </div>
            <form action={async (fd) => {
              await editarReparacion(fd)
              onUpdate()
              dialogRef.current?.close()
              toast.success("Información actualizada")
            }} className={styles.formGrid}>
              <input type="hidden" name="id" value={reparacion.id} />
              
              {/* DATOS GENERALES */}
              <div className={styles.formGroup}>
                <label className={styles.label}>Dispositivo</label>
                <input name="dispositivo" defaultValue={reparacion.dispositivo} className={styles.input} required />
              </div>

              {/* CORRECCIÓN AQUÍ: Agregamos el teléfono en el grid */}
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Cliente</label>
                      <input name="cliente_nombre" defaultValue={reparacion.cliente_nombre} className={styles.input} />
                  </div>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Teléfono</label>
                      <input name="cliente_telefono" defaultValue={reparacion.cliente_telefono} className={styles.input} />
                  </div>
              </div>

              {/* La categoría la movemos abajo para que tenga espacio */}
              <div className={styles.formGroup}>
                  <label className={styles.label}>Categoría</label>
                  <select name="categoria" defaultValue={reparacion.categoria} className={styles.select}>
                      {CATEGORIAS_REPARACION.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
              </div>

              {/* SECCIÓN FINANCIERA */}
              <div style={{background:'rgba(59, 130, 246, 0.1)', padding:'1rem', borderRadius:'8px', marginTop:'0.5rem'}}>
                  <div style={{fontWeight:'bold', color:'#60a5fa', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'5px'}}>
                      <Wallet size={16}/> Finanzas
                  </div>
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Precio Final (Q)</label>
                        <input name="precio" type="number" step="0.01" defaultValue={reparacion.precio} className={styles.input} placeholder="Cobro al cliente" />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Comisión (Q)</label>
                        <input name="comision" type="number" step="0.01" defaultValue={reparacion.comision} className={styles.input} placeholder="comision por recepcion" />
                    </div>
                  </div>
                  <div className={styles.formGroup} style={{marginTop:'0.5rem'}}>
                      <label className={styles.label}>Costo de Reparacion</label>
                      <input name="cotizacion" type="number" step="0.01" defaultValue={reparacion.cotizacion} className={styles.input} />
                  </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Falla / Detalles</label>
                <textarea name="falla" defaultValue={reparacion.falla} className={styles.textarea} required />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Historial Observaciones</label>
                <textarea name="observaciones" defaultValue={reparacion.observaciones} className={styles.textarea} rows={3} />
              </div>

              <button type="submit" className={styles.submitButton}>Guardar Cambios</button>
            </form>
          </div>
        </dialog>
      </>
    )
  }

// --- MODAL: CAMBIAR ESTADO (Mismo de antes) ---
function StatusModal({ reparacion, onUpdate }: { reparacion: any, onUpdate: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [estado, setEstado] = useState(reparacion.estado)
  const [nota, setNota] = useState('')

  const handleUpdate = async () => {
    await actualizarEstado(reparacion.id, estado, nota)
    onUpdate()
    setNota('')
    dialogRef.current?.close()
    toast.success("Estado actualizado")
  }

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()} className={`${styles.iconBtn} ${styles.btnStatus}`} title="Cambiar Estado">
        <RefreshCcw size={16} />
      </button>
      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Actualizar Estado</h3>
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton}>×</button>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Nuevo Estado</label>
                <select className={styles.select} value={estado} onChange={(e) => setEstado(e.target.value)}>
                    <option value="Pendiente">🟡 Pendiente</option>
                    <option value="Reparado">🟢 Reparado</option>
                    <option value="Sin Solución">🔴 Sin Solución</option>
                    <option value="Entregado">⚪ Entregado</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Nota (Opcional)</label>
                <textarea className={styles.textarea} placeholder="Detalles del cambio..." value={nota} onChange={(e) => setNota(e.target.value)} />
            </div>
            <button onClick={handleUpdate} className={styles.submitButton}>Confirmar</button>
          </div>
        </div>
      </dialog>
    </>
  )
}
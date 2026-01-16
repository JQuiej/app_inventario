'use client'
import { useState, useEffect, useRef, useTransition } from 'react'
import { Plus, Pencil, Trash2, RefreshCcw, Phone, Search, Filter, Wallet, Calendar, Clock, Loader2, AlertCircle, CheckCircle2, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { getReparaciones, crearReparacion, actualizarEstado, eliminarReparacion, editarReparacion } from './actions'
import styles from './reparaciones.module.css'

// CATEGORÍAS DEFINIDAS
const CATEGORIAS_REPARACION = [
  "Pantalla", "Placa de carga", "Batería", "Liberación", "FRP / Cuenta Google", "Formateo / Software", "Limpieza / Mantenimiento", "Otra"
]

export default function ReparacionesPage() {
  const [reparaciones, setReparaciones] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Pendiente')

  const cargarDatos = async () => {
    setLoading(true)
    const data = await getReparaciones()
    setReparaciones(data)
    setLoading(false)
  }

  useEffect(() => { cargarDatos() }, [])

  // Estadísticas
  const pendientesCount = reparaciones.filter(r => r.estado === 'Pendiente').length
  const reparadosCount = reparaciones.filter(r => r.estado === 'Reparado').length

  const reparacionesFiltradas = reparaciones.filter(rep => {
    const texto = busqueda.toLowerCase()
    
    // 1. Coincidencia de texto
    const coincideTexto = 
        rep.cliente_nombre.toLowerCase().includes(texto) ||
        rep.dispositivo.toLowerCase().includes(texto) ||
        rep.cliente_telefono?.includes(texto)
    
    // 2. LÓGICA DE FILTRO MODIFICADA:
    // Si hay texto en la búsqueda (busqueda !== ''), ignoramos el filtro de estado (mostramos todo lo que coincida).
    // Si NO hay búsqueda, respetamos el filtro seleccionado.
    const coincideEstado = busqueda !== '' 
        ? true 
        : (filtroEstado === 'Todos' || rep.estado === filtroEstado)

    return coincideTexto && coincideEstado
  })

  // --- CONTACTO CON MENSAJE PERSONALIZADO ---
  const handleContactar = (rep: any) => {
    if (!rep.cliente_telefono) return toast.error("Sin teléfono registrado")
    
    const numLimpio = rep.cliente_telefono.replace(/\D/g, '') 
    const numWhatsapp = numLimpio.length === 8 ? `502${numLimpio}` : numLimpio

    // Crear mensaje personalizado
    const mensaje = `Hola ${rep.cliente_nombre}, le escribimos de parte de MASTERCELL respecto a la reparación de su ${rep.dispositivo} (Falla: ${rep.falla}).`
    const urlWhatsapp = `https://wa.me/${numWhatsapp}?text=${encodeURIComponent(mensaje)}`

    toast.custom((t) => (
      <div className={styles.contactToast}>
        <div style={{fontWeight: 'bold', marginBottom:'0.5rem'}}>Contactar a {rep.cliente_nombre}</div>
        <div className={styles.contactActions}>
            <button 
                onClick={() => { window.open(urlWhatsapp, '_blank'); toast.dismiss(t) }} 
                className={styles.btnWhatsapp}
            >
                WhatsApp
            </button>
            <button 
                onClick={() => { window.open(`tel:${numLimpio}`); toast.dismiss(t) }} 
                className={styles.btnCall}
            >
                Llamar
            </button>
        </div>
      </div>
    ), { duration: 5000 })
  }

  function calcularTiempo(fecha: string) {
    if (!fecha) return '-'
    const diff = new Date().getTime() - new Date(fecha).getTime();
    const dias = Math.floor(diff / (1000 * 3600 * 24));
    if (dias === 0) {
        const horas = Math.floor(diff / (1000 * 3600));
        return horas === 0 ? 'Hace un momento' : `Hace ${horas}h`;
    }
    return `Hace ${dias} días`;
  }

  const handleDelete = (id: string) => {
    toast('¿Eliminar registro?', {
      action: { label: 'Eliminar', onClick: async () => { await eliminarReparacion(id); cargarDatos(); toast.success('Eliminado') } },
      cancel: { label: 'Cancelar', onClick: () => {} },
      actionButtonStyle: { backgroundColor: '#ef4444' }
    })
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Reparaciones</h1>
          <div className={styles.statsContainer}>
            <div className={styles.statItem} style={{ borderLeft: '4px solid #facc15' }}>
              <AlertCircle size={20} color="#facc15" />
              <div>
                <div className={styles.statLabel}>Pendientes de Reparar</div>
                <div className={styles.statNumber}>{pendientesCount}</div>
              </div>
            </div>
            <div className={styles.statItem} style={{ borderLeft: '4px solid #4ade80' }}>
              <CheckCircle2 size={20} color="#4ade80" />
              <div>
                <div className={styles.statLabel}>Listos para Entregar</div>
                <div className={styles.statNumber}>{reparadosCount}</div>
              </div>
            </div>
          </div>
        </div>
        
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
                <th style={{width: '50px', textAlign: 'center'}}>No.</th>
                <th>Cliente / Recepción</th>
                <th>Falla / Categoría</th>
                <th>Estado Reparación</th>
                <th style={{textAlign:'right'}}>Costo</th>
                <th style={{textAlign:'right'}}>Cobro / Pago</th>
                <th style={{textAlign:'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={6} style={{padding:'2rem', textAlign:'center'}}>Cargando...</td></tr>}
              {!loading && reparacionesFiltradas.length === 0 && (
                <tr><td colSpan={6} style={{padding:'2rem', textAlign:'center', color:'#94a3b8'}}>No se encontraron datos.</td></tr>
              )}

              {reparacionesFiltradas.map((rep, index) => (
                <tr key={rep.id}>
                  <td style={{textAlign: 'center', fontWeight: 'bold', color: '#64748b', verticalAlign: 'middle'}}>
                    {index + 1}
                  </td>
                  <td>
                    <div style={{fontWeight:'bold', color:'white'}}>{rep.cliente_nombre}</div>
                    <div style={{fontSize:'0.8rem', color:'#cbd5e1'}}>{rep.dispositivo}</div>
                    <div style={{fontSize:'0.75rem', color:'#64748b', marginTop:'4px', display:'flex', alignItems:'center', gap:'4px'}}>
                        <Calendar size={12}/> 
                        {rep.fecha_recepcion ? new Date(rep.fecha_recepcion).toLocaleDateString() : 'N/A'}
                    </div>
                  </td>
                  <td>
                    <span style={{fontSize:'0.75rem', background:'#334155', padding:'2px 6px', borderRadius:'4px', color:'#cbd5e1'}}>
                        {rep.categoria || 'Otra'}
                    </span>
                    <div style={{fontSize:'0.9rem', marginTop:'4px'}}>{rep.falla}</div>
                  </td>
                  <td>
                    <div style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                      {/* 1. Badge de Estado (Ya existía) */}
                      <span className={`${styles.badge} ${styles['status' + rep.estado.replace(' ', '')]}`} style={{alignSelf: 'flex-start'}}>
                        {rep.estado}
                      </span>

                      {/* 2. NUEVO: Observaciones debajo del estado */}
                      {rep.observaciones && (
                        <div style={{
                          fontSize: '0.75rem',
                          color: '#cbd5e1', // Color gris claro
                          background: 'rgba(255,255,255,0.05)', // Fondo muy sutil
                          padding: '4px 6px',
                          borderRadius: '4px',
                          maxWidth: '220px', // Evita que la tabla se ensanche demasiado
                          lineHeight: '1.2',
                          fontStyle: 'italic',
                          whiteSpace: 'normal' // Permite que el texto baje de línea
                        }}>
                          "{rep.observaciones}"
                        </div>
                      )}

                      {/* 3. Tiempo transcurrido (Ya existía) */}
                      <div style={{fontSize:'0.7rem', color:'#64748b', marginTop:'2px', display:'flex', alignItems:'center', gap:'4px'}}>
                          <Clock size={12}/>
                          {calcularTiempo(rep.ultimo_cambio_estado || rep.created_at)}
                      </div>
                    </div>
                  </td>
                  <td style={{textAlign:'right', color:'#94a3b8'}}>Q{rep.cotizacion}</td>
                  
                  {/* COLUMNA COBRO / ESTADO DE PAGO */}
                  <td style={{textAlign:'right'}}>
                    {rep.precio > 0 ? (
                        <div>
                            <div style={{color:'#34d399', fontWeight:'bold'}}>Q{rep.precio}</div>
                            
                            {/* INDICADOR DE ESTADO DE PAGO */}
                            <div style={{marginTop:'4px'}}>
                              {rep.estado_pago === 'Pagado' ? (
                                <span style={{fontSize:'0.7rem', background:'#064e3b', color:'#34d399', padding:'2px 6px', borderRadius:'99px', border:'1px solid #059669'}}>
                                  PAGADO
                                </span>
                              ) : (
                                <span style={{fontSize:'0.7rem', background:'#ad4343ff', color:'#f87171', padding:'2px 6px', borderRadius:'99px', border:'1px solid #e04444ff'}}>
                                  PENDIENTE
                                </span>
                              )}
                            </div>

                            {/* Detalle de deuda si no está pagado */}
                            {rep.estado_pago !== 'Pagado' && (
                              <div style={{fontSize:'0.75rem', color:'#e2e8f0', marginTop:'2px'}}>
                                  Resta: <b>Q{(rep.precio - (rep.adelanto || 0)).toFixed(2)}</b>
                              </div>
                            )}
                        </div>
                    ) : (
                         <span style={{color:'#64748b'}}>-</span>
                    )}
                  </td>
                  
                  <td>
                    <div className={styles.actions}>
                      {/* Pasamos el objeto completo 'rep' para tener todos los datos */}
                      <button onClick={() => handleContactar(rep)} className={`${styles.iconBtn} ${styles.btnContact}`}>
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

// --- MODAL: EDITAR INFORMACIÓN Y PAGO ---
function EditRepairModal({ reparacion, onUpdate }: { reparacion: any, onUpdate: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [isPending, startTransition] = useTransition()
  
    // Estado local
    const [pagoStatus, setPagoStatus] = useState(reparacion.estado_pago || 'Pendiente')

    // 1. EFECTO DE SEGURIDAD: Si la reparación cambia "desde fuera" (ej. recarga), actualizamos.
    useEffect(() => {
        setPagoStatus(reparacion.estado_pago || 'Pendiente')
    }, [reparacion.estado_pago])

    const fechaRecepcionStr = reparacion.fecha_recepcion 
        ? new Date(new Date(reparacion.fecha_recepcion).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16)
        : '';

    const handleSubmit = (formData: FormData) => {
        startTransition(async () => {
            await editarReparacion(formData)
            onUpdate()
            dialogRef.current?.close()
            toast.success("Información actualizada")
        })
    }

    // 2. FUNCIÓN DE APERTURA: Resetea el estado SIEMPRE al abrir
    const openModal = () => {
        setPagoStatus(reparacion.estado_pago || 'Pendiente') 
        dialogRef.current?.showModal()
    }

    return (
      <>
        {/* Usamos openModal en lugar de abrir el dialog directamente */}
        <button onClick={openModal} className={`${styles.iconBtn} ${styles.btnEdit}`} title="Editar / Cobrar">
          <Pencil size={16} />
        </button>

        <dialog ref={dialogRef} className={styles.dialog}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3>Editar / Confirmar Pago</h3>
              <button onClick={() => dialogRef.current?.close()} className={styles.closeButton} disabled={isPending}>×</button>
            </div>
            <form action={handleSubmit} className={styles.formGrid}>
              <input type="hidden" name="id" value={reparacion.id} />
              
              {/* DATOS GENERALES */}
              <div style={{display:'grid', gridTemplateColumns:'2fr 1fr', gap:'1rem'}}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Dispositivo</label>
                    <input name="dispositivo" defaultValue={reparacion.dispositivo} className={styles.input} required disabled={isPending} />
                  </div>
                  <div className={styles.formGroup}>
                     <label className={styles.label}>Recepción</label>
                     <input name="fecha_recepcion" type="datetime-local" defaultValue={fechaRecepcionStr} className={styles.input} disabled={isPending} />
                  </div>
              </div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Cliente</label>
                      <input name="cliente_nombre" defaultValue={reparacion.cliente_nombre} className={styles.input} disabled={isPending} />
                  </div>
                  <div className={styles.formGroup}>
                      <label className={styles.label}>Teléfono</label>
                      <input name="cliente_telefono" defaultValue={reparacion.cliente_telefono} className={styles.input} disabled={isPending} />
                  </div>
              </div>
              <div className={styles.formGroup}>
                  <label className={styles.label}>Categoría</label>
                  <select name="categoria" defaultValue={reparacion.categoria} className={styles.select} disabled={isPending}>
                      {CATEGORIAS_REPARACION.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
              </div>

              {/* SECCIÓN FINANCIERA */}
              <div style={{background:'rgba(59, 130, 246, 0.1)', padding:'1rem', borderRadius:'8px', marginTop:'0.5rem'}}>
                  <div style={{fontWeight:'bold', color:'#60a5fa', marginBottom:'0.5rem', display:'flex', alignItems:'center', gap:'5px'}}>
                      <Wallet size={16}/> Finanzas y Pagos
                  </div>
                  
                  {/* SELECTOR DE PAGO SINCRONIZADO */}
                  <div className={styles.formGroup} style={{marginBottom:'1rem'}}>
                      <label className={styles.label} style={{color: pagoStatus === 'Pagado' ? '#34d399' : '#f87171'}}>Estado del Pago</label>
                      <select 
                        name="estado_pago" 
                        value={pagoStatus}
                        onChange={(e) => setPagoStatus(e.target.value)}
                        className={styles.select}
                        style={{
                            borderColor: pagoStatus === 'Pagado' ? '#059669' : '#b91c1c', 
                            color: pagoStatus === 'Pagado' ? '#34d399' : '#f87171',
                            fontWeight: 'bold'
                        }}
                        disabled={isPending}
                      >
                          <option value="Pendiente">⚠ PENDIENTE DE PAGO</option>
                          <option value="Pagado">✓ PAGADO COMPLETO</option>
                      </select>
                  </div>

                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Precio Final (Q)</label>
                        <input name="precio" type="number" step="0.01" defaultValue={reparacion.precio} className={styles.input} placeholder="0.00" disabled={isPending} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Adelanto (Q)</label>
                        <input name="adelanto" type="number" step="0.01" defaultValue={reparacion.adelanto} className={styles.input} placeholder="0.00" disabled={isPending} />
                    </div>
                  </div>
                  
                  <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem', marginTop:'0.5rem', opacity: 0.8}}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Costo de reparacion </label>
                        <input name="cotizacion" type="number" step="0.01" defaultValue={reparacion.cotizacion} className={styles.input} disabled={isPending} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Comisión </label>
                        <input name="comision" type="number" step="0.01" defaultValue={reparacion.comision} className={styles.input} placeholder="0.00" disabled={isPending} />
                    </div>
                  </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Falla / Detalles</label>
                <textarea name="falla" defaultValue={reparacion.falla} className={styles.textarea} required disabled={isPending} />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Observaciones</label>
                <textarea name="observaciones" defaultValue={reparacion.observaciones} className={styles.textarea} rows={3} disabled={isPending} />
              </div>

              <button 
                type="submit" 
                className={styles.submitButton}
                disabled={isPending}
                style={{ opacity: isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                 {isPending ? <><Loader2 className="animate-spin" size={18}/> Guardando...</> : 'Confirmar Cambios'}
              </button>
            </form>
          </div>
        </dialog>
      </>
    )
}

function NewRepairModal({ onSave }: { onSave: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const defaultDate = new Date();
  defaultDate.setMinutes(defaultDate.getMinutes() - defaultDate.getTimezoneOffset());
  const defaultDateString = defaultDate.toISOString().slice(0, 16);

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
        await crearReparacion(formData)
        onSave()
        dialogRef.current?.close()
        toast.success("Ingreso registrado")
    })
  }

  return (
    <>
      <button onClick={() => dialogRef.current?.showModal()} className={styles.btnPrimary}>
        <Plus size={18} /> Ingreso
      </button>
      <dialog ref={dialogRef} className={styles.dialog}>
        <div className={styles.modalContent}>
          <div className={styles.modalHeader}>
            <h3>Nuevo Ingreso</h3>
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton} disabled={isPending}>×</button>
          </div>
          <form action={handleSubmit} className={styles.formGrid}>
            <div className={styles.formGroup}>
              <label className={styles.label}>Cliente</label>
              <input name="cliente_nombre" className={styles.input} required placeholder="Nombre completo" disabled={isPending} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Teléfono</label>
                    <input name="cliente_telefono" className={styles.input} placeholder="5555-5555" disabled={isPending} />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Fecha Recepción</label>
                    <input name="fecha_recepcion" type="datetime-local" defaultValue={defaultDateString} className={styles.input} disabled={isPending} />
                </div>
            </div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Dispositivo</label>
              <input name="dispositivo" className={styles.input} required placeholder="Marca y Modelo" disabled={isPending} />
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem'}}>
                 <div className={styles.formGroup}>
                    <label className={styles.label}>Categoría</label>
                    <select name="categoria" className={styles.select} disabled={isPending}>
                        {CATEGORIAS_REPARACION.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Falla Reportada</label>
                    <input name="falla" className={styles.input} required placeholder="Pantalla rota..." disabled={isPending} />
                </div>
            </div>
            <div style={{background:'rgba(59, 130, 246, 0.05)', padding:'1rem', borderRadius:'8px', marginTop:'0.5rem', border:'1px solid #334155'}}>
                <div style={{fontWeight:'bold', color:'#94a3b8', marginBottom:'0.5rem', fontSize:'0.85rem'}}>ESTIMACIÓN DE COSTOS</div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'1rem'}}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Costo Reparacion</label>
                        <input name="cotizacion" type="number" step="0.01" className={styles.input} placeholder="0.00" disabled={isPending} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Precio Cliente</label>
                        <input name="precio" type="number" step="0.01" className={styles.input} placeholder="0.00" disabled={isPending} />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label} style={{color:'#60a5fa'}}>Adelanto</label>
                        <input name="adelanto" type="number" step="0.01" className={styles.input} placeholder="0.00" disabled={isPending} />
                    </div>
                </div>
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Observaciones</label>
                <textarea name="observaciones" className={styles.textarea} rows={2} disabled={isPending} />
            </div>
            <button type="submit" className={styles.submitButton} disabled={isPending} style={{ opacity: isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isPending ? <><Loader2 className="animate-spin" size={18}/> Registrando...</> : 'Registrar'}
            </button>
          </form>
        </div>
      </dialog>
    </>
  )
}

function StatusModal({ reparacion, onUpdate }: { reparacion: any, onUpdate: () => void }) { 
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [estado, setEstado] = useState(reparacion.estado)
  const [nota, setNota] = useState('')
  const [isPending, startTransition] = useTransition()

  const handleUpdate = () => {
    startTransition(async () => {
        const fechaDispositivo = new Date().toISOString()
        await actualizarEstado(reparacion.id, estado, nota, fechaDispositivo)
        onUpdate()
        setNota('')
        dialogRef.current?.close()
        toast.success("Estado actualizado")
    })
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
            <button onClick={() => dialogRef.current?.close()} className={styles.closeButton} disabled={isPending}>×</button>
          </div>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}>
                <label className={styles.label}>Nuevo Estado</label>
                <select className={styles.select} value={estado} onChange={(e) => setEstado(e.target.value)} disabled={isPending}>
                    <option value="Pendiente">🟡 Pendiente</option>
                    <option value="Reparado">🟢 Reparado</option>
                    <option value="Sin Solución">🔴 Sin Solución</option>
                    <option value="Entregado">⚪ Entregado</option>
                </select>
            </div>
            <div className={styles.formGroup}>
                <label className={styles.label}>Nota (Opcional)</label>
                <textarea className={styles.textarea} placeholder="Detalles del cambio..." value={nota} onChange={(e) => setNota(e.target.value)} disabled={isPending} />
            </div>
            <button onClick={handleUpdate} className={styles.submitButton} disabled={isPending} style={{ opacity: isPending ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isPending ? <><Loader2 className="animate-spin" size={18}/> Procesando...</> : 'Confirmar'}
            </button>
          </div>
        </div>
      </dialog>
    </>
  )
}
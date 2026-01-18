'use client'
import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Plus, Calendar, Tag, Search, Trash2, Edit, X, Eye, Loader2 } from 'lucide-react'

import { 
  crearCampana, 
  actualizarCampana, 
  eliminarCampana, 
  getCampanasConBalance, 
  registrarPagoProveedor, 
  getCategorias, 
  getProductosDeCategoria,
  getHistorialCampana 
} from './actions'

import styles from './reembolsos.module.css'

// --- FUNCIÓN HELPER PARA CORREGIR FECHAS ---
// Esta función asegura que la fecha se muestre tal cual viene de la BD (UTC)
// sin restarle horas por la zona horaria local.
const formatDateUTC = (dateString: string) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-GT', {
    timeZone: 'UTC', // <--- ESTO ES LA CLAVE: Forzamos UTC
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date)
}

// Función para obtener el string YYYY-MM-DD para los inputs date sin desfase
const getInputDateValue = (dateString: string) => {
    if (!dateString) return ''
    // Cortamos el string ISO directamente antes de la 'T' para evitar conversiones de zona horaria
    // Ej: "2025-12-01T00:00:00..." -> "2025-12-01"
    return dateString.split('T')[0]
}

export default function ReembolsosPage() {
  // ... (Tus estados se mantienen igual)
  const [campanas, setCampanas] = useState<any[]>([])
  const [categorias, setCategorias] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editingCampaign, setEditingCampaign] = useState<any | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [historyCampaign, setHistoryCampaign] = useState<any | null>(null)

  const loadData = async () => {
    setLoading(true)
    try {
        const [c, cats] = await Promise.all([
            getCampanasConBalance(), 
            getCategorias()
        ])
        setCampanas(Array.isArray(c) ? c : [])
        setCategorias(Array.isArray(cats) ? cats : [])
    } catch (error) {
        console.error(error)
        toast.error("Error al cargar datos")
    }
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  const handleDelete = (id: string) => {
    toast("¿Estás seguro de eliminar esta campaña?", {
        description: "Se borrará la configuración y el historial asociado.",
        action: {
            label: "Eliminar",
            onClick: async () => {
                try {
                    await eliminarCampana(id)
                    toast.success("Campaña eliminada correctamente")
                    loadData()
                } catch (e) {
                    toast.error("No se pudo eliminar la campaña")
                }
            }
        },
        cancel: { label: 'Cancelar', onClick: () => {} },
    })
  }

  const handleEdit = (campana: any) => {
    setEditingCampaign(campana)
    setIsModalOpen(true)
  }

  const handleCreate = () => {
    setEditingCampaign(null)
    setIsModalOpen(true)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Feria de Descuentos (TAM)</h1>
      </div>

      <div>
        <button onClick={handleCreate} className={styles.btnNew}>
            <Plus size={18}/> Nueva Campaña
        </button>

        {isModalOpen && (
            <CampaignModal 
                categorias={categorias} 
                initialData={editingCampaign}
                onClose={() => setIsModalOpen(false)}
                onSave={() => { loadData(); setIsModalOpen(false) }} 
            />
        )}

        {historyCampaign && (
            <HistoryModal 
                campana={historyCampaign} 
                onClose={() => setHistoryCampaign(null)} 
            />
        )}

        {loading && <div style={{textAlign:'center', padding:'2rem', color:'#64748b'}}>Cargando...</div>}

        <div className={styles.campaignsGrid}>
            {campanas.map(c => {
                const isActive = new Date(c.fecha_fin) >= new Date()
                const porcentaje = c.total_generado > 0 ? (c.total_pagado / c.total_generado) * 100 : 0
                
                return (
                    <div key={c.id} className={`${styles.campaignCard} ${!isActive ? styles.campaignCardInactive : ''}`}>
                        <div className={styles.cardHeader}>
                            <span className={styles.categoryTag}>{c.categorias?.nombre}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setHistoryCampaign(c)} className="p-1 text-gray-400 hover:text-green-400 transition-colors" title="Ver Historial">
                                    <Eye size={16} />
                                </button>
                                <button onClick={() => handleEdit(c)} className="p-1 text-gray-400 hover:text-blue-400 transition-colors" title="Editar">
                                    <Edit size={14} />
                                </button>
                                <button onClick={() => handleDelete(c.id)} className="p-1 text-gray-400 hover:text-red-400 transition-colors" title="Eliminar">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="flex justify-between items-start mt-2">
                            <h3 className={styles.campaignTitle}>{c.nombre}</h3>
                            {isActive ? <span className={styles.statusTextActive}>Activa</span> : <span className={styles.statusTextFinished}>Cerrada</span>}
                        </div>

                        {/* --- AQUI APLICAMOS LA CORRECCION DE FECHA EN LA TARJETA --- */}
                        <div className={styles.campaignDates}>
                            <Calendar size={14}/> 
                            {formatDateUTC(c.fecha_inicio)} - {formatDateUTC(c.fecha_fin)}
                        </div>

                        <div style={{marginTop:'1rem', padding:'1rem', background:'rgba(15, 23, 42, 0.5)', borderRadius:'8px'}}>
                            <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.85rem', color:'#94a3b8', marginBottom:'4px'}}>
                                <span>Generado: Q{c.total_generado.toFixed(2)}</span>
                                <span>Pagado: Q{c.total_pagado.toFixed(2)}</span>
                            </div>
                            <div style={{width:'100%', height:'6px', background:'#334155', borderRadius:'3px', overflow:'hidden'}}>
                                <div style={{width: `${Math.min(porcentaje, 100)}%`, height:'100%', background:'#34d399'}}></div>
                            </div>
                            <div style={{marginTop:'8px', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                                <span style={{fontSize:'0.8rem', color:'#cbd5e1'}}>Pendiente:</span>
                                <span style={{fontSize:'1.1rem', fontWeight:'bold', color: c.saldo_pendiente > 0 ? '#facc15' : '#94a3b8'}}>
                                    Q{c.saldo_pendiente.toFixed(2)}
                                </span>
                            </div>
                        </div>

                        <div style={{marginTop:'1rem', display:'flex', gap:'10px'}}>
                            <PaymentModal campana={c} onSave={loadData} />
                        </div>
                    </div>
                )
            })}
        </div>
      </div>
    </div>
  )
}

// --- MODAL CREAR/EDITAR CAMPAÑA ---
function CampaignModal({ categorias, initialData, onClose, onSave }: { categorias: any[], initialData?: any, onClose: () => void, onSave: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [loadingProds, setLoadingProds] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [productos, setProductos] = useState<any[]>([]) 
    
    const [selectedCat, setSelectedCat] = useState(initialData?.categoria_id || '')
    const [searchTerm, setSearchTerm] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])

    const [addedProducts, setAddedProducts] = useState<any[]>(() => {
        if (!initialData) return []
        const listaDB = initialData.promociones_productos || initialData.promocion_productos || []
        if (listaDB.length > 0) {
            return listaDB.map((item: any) => ({
                id: item.productos?.id,      
                nombre: item.productos?.nombre || 'Producto desconocido',
                monto: item.descuento || item.monto_descuento || 0   
            }))
        }
        return initialData.productos_configurados || []
    })

    useEffect(() => { dialogRef.current?.showModal() }, [])

    useEffect(() => {
        if (!selectedCat) { setProductos([]); return }
        setLoadingProds(true)
        getProductosDeCategoria(selectedCat).then(data => {
            setProductos(data); setLoadingProds(false)
        })
    }, [selectedCat])

    useEffect(() => {
        if (searchTerm.trim() === '') { setSearchResults([]); return }
        const filtered = productos.filter(p => p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) && !addedProducts.find(added => added.id === p.id))
        setSearchResults(filtered)
    }, [searchTerm, productos, addedProducts])

    const handleAddProduct = (prod: any) => { setAddedProducts([...addedProducts, { id: prod.id, nombre: prod.nombre, monto: 0 }]); setSearchTerm('') }
    const handleRemoveProduct = (id: string) => { setAddedProducts(addedProducts.filter(p => p.id !== id)) }
    const handleAmountChange = (id: string, val: string) => {
        const monto = parseFloat(val) || 0; setAddedProducts(addedProducts.map(p => p.id === id ? { ...p, monto } : p))
    }

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (isSubmitting) return;

        const formData = new FormData(e.currentTarget)
        
        // CORRECCIÓN FECHA: Fijamos la hora final
        const fechaFinRaw = formData.get('fecha_fin') as string
        if (fechaFinRaw) {
            formData.set('fecha_fin', `${fechaFinRaw} 23:59:59`)
        }

        if (addedProducts.length === 0) return toast.error("Selecciona al menos un producto")
        if (addedProducts.some(p => p.monto <= 0)) return toast.error("Descuentos deben ser mayores a 0")

        setIsSubmitting(true)
        try {
            if (initialData) {
                await actualizarCampana(initialData.id, formData, addedProducts)
                toast.success('Campaña actualizada')
            } else {
                await crearCampana(formData, addedProducts)
                toast.success('Campaña creada')
            }
            onSave()
            dialogRef.current?.close()
        } catch (error) {
            console.error(error)
            toast.error("Error al guardar campaña")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <dialog ref={dialogRef} className={styles.dialog} style={{width:'650px'}} onClose={!isSubmitting ? onClose : undefined}>
            <div className="flex justify-between items-center mb-4">
                <h3 className={styles.modalTitle}>{initialData ? 'Editar Campaña' : 'Configurar Campaña TAM'}</h3>
                {!isSubmitting && (
                    <button type="button" onClick={() => { dialogRef.current?.close(); onClose() }} className="text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                )}
            </div>
            
            <form onSubmit={handleSubmit} className={styles.form}>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Nombre Campaña</label>
                    <input name="nombre" required defaultValue={initialData?.nombre} className={styles.input} disabled={isSubmitting} />
                </div>
                <div className={styles.formRow}>
                    {/* --- CORRECCIÓN EN INPUTS: USAR getInputDateValue PARA QUE NO SE MUEVA EL DÍA AL EDITAR --- */}
                    <div className={styles.formGroup}>
                         <label className={styles.label}>Inicio</label>
                         <input name="fecha_inicio" type="date" required 
                            defaultValue={getInputDateValue(initialData?.fecha_inicio)}
                            className={styles.input} disabled={isSubmitting}
                        />
                    </div>
                    <div className={styles.formGroup}>
                         <label className={styles.label}>Termina</label>
                         <input name="fecha_fin" type="date" required 
                            defaultValue={getInputDateValue(initialData?.fecha_fin)}
                            className={styles.input} disabled={isSubmitting}
                        />
                    </div>
                </div>

                <hr style={{borderColor:'#334155', margin:'0.5rem 0'}}/>

                <div className={styles.formGroup}>
                    <label className={styles.label}>1. Filtrar por Categoría</label>
                    <select name="categoria_id" required className={styles.select} value={selectedCat} disabled={isSubmitting}
                        onChange={(e) => { 
                            if(initialData && addedProducts.length > 0) {
                                if(!confirm("Si cambias la categoría se reiniciará la lista de productos. ¿Continuar?")) return;
                            }
                            setSelectedCat(e.target.value); 
                            setAddedProducts([]) 
                        }}
                    >
                        <option value="">-- Seleccionar --</option>
                        {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                </div>

                {/* (El resto del componente CampaignModal se mantiene igual que antes...) */}
                <div className={styles.formGroup}>
                    <label className={styles.label}>2. Buscar y Agregar Modelos</label>
                    <div className="relative mb-4">
                        <div className="flex items-center bg-[#0f172a] border border-[#334155] rounded px-2">
                            <Search size={16} className="text-gray-400 mr-2" />
                            <input type="text" placeholder={loadingProds ? "Cargando..." : "Buscar modelo..."}
                                className="w-full bg-transparent border-none outline-none text-white py-2 text-sm"
                                value={searchTerm} onChange={e => setSearchTerm(e.target.value)} 
                                disabled={!selectedCat || isSubmitting}
                            />
                        </div>
                        {searchResults.length > 0 && (
                            <ul className="absolute z-10 w-full bg-[#1e293b] border border-[#334155] rounded mt-1 max-h-40 overflow-auto shadow-xl">
                                {searchResults.map(p => (
                                    <li key={p.id} onClick={() => handleAddProduct(p)} className="px-3 py-2 hover:bg-[#334155] cursor-pointer text-sm text-gray-200 flex justify-between">
                                        <span>{p.nombre}</span> <Plus size={14} className="text-blue-400"/>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                    <div className="bg-[#1e293b] border border-[#334155] rounded-md overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#0f172a] text-gray-400">
                                <tr>
                                    <th className="px-3 py-2 font-medium">Modelo</th>
                                    <th className="px-3 py-2 font-medium w-32 text-right">Descuento (Q)</th>
                                    <th className="w-10"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {addedProducts.map(p => (
                                    <tr key={p.id} className="border-t border-[#334155]">
                                        <td className="px-3 py-2 text-white">{p.nombre}</td>
                                        <td className="px-3 py-2">
                                            <input type="number" step="0.01" className="w-full bg-[#0f172a] border border-[#3b82f6] text-white rounded px-2 py-1 text-right focus:outline-none"
                                                value={p.monto || ''} onChange={(e) => handleAmountChange(p.id, e.target.value)} required disabled={isSubmitting}
                                            />
                                        </td>
                                        <td className="px-2 text-center">
                                            <button type="button" onClick={() => handleRemoveProduct(p.id)} className="text-red-500 hover:text-red-400 p-1" disabled={isSubmitting}>
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {addedProducts.length === 0 && <tr><td colSpan={3} className="px-3 py-4 text-center text-gray-500 italic">Sin productos seleccionados.</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.modalActions}>
                    <button type="button" onClick={() => { dialogRef.current?.close(); onClose() }} className={styles.btnCancel} disabled={isSubmitting}>Cancelar</button>
                    <button type="submit" className={styles.btnSubmit} disabled={isSubmitting} style={{display:'flex', alignItems:'center', gap:'8px', justifyContent:'center'}}>
                        {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                        {isSubmitting ? 'Procesando...' : (initialData ? 'Guardar Cambios' : 'Crear Campaña')}
                    </button>
                </div>
            </form>
        </dialog>
    )
}

// --- MODAL PAGOS ---
function PaymentModal({ campana, onSave }: { campana: any, onSave: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [monto, setMonto] = useState('')
    const [notas, setNotas] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isSubmitting) return;

        setIsSubmitting(true)
        try {
            await registrarPagoProveedor(campana.id, parseFloat(monto), notas)
            toast.success("Pago registrado")
            onSave()
            dialogRef.current?.close()
            setMonto(''); setNotas('')
        } catch (error) {
            toast.error("Error al registrar pago")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <>
            <button onClick={() => dialogRef.current?.showModal()} disabled={campana.saldo_pendiente <= 0.01}
                style={{
                    width:'100%', padding:'8px', borderRadius:'6px', border:'none', fontWeight:'bold', cursor:'pointer',
                    background: campana.saldo_pendiente > 0.01 ? '#3b82f6' : '#334155',
                    color: campana.saldo_pendiente > 0.01 ? 'white' : '#64748b'
                }}
            >
                {campana.saldo_pendiente > 0.01 ? 'Registrar Pago' : 'Saldado'}
            </button>

            <dialog ref={dialogRef} className={styles.dialog} style={{width:'350px'}} onClose={!isSubmitting ? () => dialogRef.current?.close() : undefined}>
                <h3 className={styles.modalTitle}>Registrar Pago</h3>
                <div style={{marginBottom:'1rem', fontSize:'0.9rem', color:'#94a3b8'}}>
                    Campaña: <span style={{color:'white'}}>{campana.nombre}</span><br/>
                    Pendiente: <span style={{color:'#facc15'}}>Q{campana.saldo_pendiente.toFixed(2)}</span>
                </div>
                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Monto Recibido (Q)</label>
                        <input type="number" step="0.01" required placeholder="0.00" className={styles.input}
                            value={monto} onChange={e => setMonto(e.target.value)} disabled={isSubmitting}
                        />
                    </div>
                    <div className={styles.formGroup}>
                        <label className={styles.label}>Notas / No. Referencia</label>
                        <textarea className={styles.input} rows={2} placeholder="desglose de pagos"
                            value={notas} onChange={e => setNotas(e.target.value)} disabled={isSubmitting}
                        />
                    </div>
                    <div className={styles.modalActions}>
                        <button type="button" onClick={() => dialogRef.current?.close()} className={styles.btnCancel} disabled={isSubmitting}>Cancelar</button>
                        <button type="submit" className={styles.btnSubmit} disabled={isSubmitting} style={{display:'flex', alignItems:'center', gap:'8px', justifyContent:'center'}}>
                            {isSubmitting && <Loader2 className="animate-spin" size={16} />}
                            {isSubmitting ? 'Guardando...' : 'Confirmar Pago'}
                        </button>
                    </div>
                </form>
            </dialog>
        </>
    )
}

// --- MODAL HISTORIAL ---
function HistoryModal({ campana, onClose }: { campana: any, onClose: () => void }) {
    const dialogRef = useRef<HTMLDialogElement>(null)
    const [tab, setTab] = useState<'ventas' | 'pagos'>('ventas')
    const [data, setData] = useState<{ventas: any[], pagos: any[]}>({ ventas: [], pagos: [] })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        dialogRef.current?.showModal()
        getHistorialCampana(campana.id).then(res => {
            setData(res)
            setLoading(false)
        })
    }, [campana.id])

    // Reusamos la función helper aquí también para consistencia
    return (
        <dialog ref={dialogRef} className={styles.dialog} style={{width:'700px', maxHeight:'80vh'}} onClose={onClose}>
            <div className="flex justify-between items-center mb-4">
                <div>
                    <h3 className={styles.modalTitle}>Historial: {campana.nombre}</h3>
                    <p className="text-xs text-gray-400">Detalle de movimientos</p>
                </div>
                <button onClick={() => { dialogRef.current?.close(); onClose() }} className="text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>

            <div className="flex border-b border-slate-700 mb-4">
                <button onClick={() => setTab('ventas')} className={`px-4 py-2 text-sm font-medium ${tab === 'ventas' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-white'}`}>
                    Ventas Generadas ({data.ventas.length})
                </button>
                <button onClick={() => setTab('pagos')} className={`px-4 py-2 text-sm font-medium ${tab === 'pagos' ? 'text-green-400 border-b-2 border-green-400' : 'text-gray-400 hover:text-white'}`}>
                    Pagos Recibidos ({data.pagos.length})
                </button>
            </div>

            <div className="overflow-y-auto" style={{ maxHeight: '400px' }}>
                {loading ? (
                    <div className="text-center py-8 text-gray-500">Cargando historial...</div>
                ) : (
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f172a] text-gray-400 sticky top-0">
                            <tr>
                                <th className="px-3 py-2">Fecha</th>
                                <th className="px-3 py-2">{tab === 'ventas' ? 'Producto' : 'Nota / Referencia'}</th>
                                <th className="px-3 py-2 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tab === 'ventas' ? (
                                data.ventas.length > 0 ? data.ventas.map((v: any) => (
                                    <tr key={v.id} className="border-t border-slate-800">
                                        <td className="px-3 py-2 text-gray-300">{formatDateUTC(v.created_at)}</td>
                                        <td className="px-3 py-2 text-white">{v.movimientos_inventario?.productos?.nombre || 'N/A'}</td>
                                        <td className="px-3 py-2 text-right text-blue-300">Q{v.monto_pendiente}</td>
                                    </tr>
                                )) : <tr><td colSpan={3} className="text-center py-4 text-gray-500">No hay ventas registradas</td></tr>
                            ) : (
                                data.pagos.length > 0 ? data.pagos.map((p: any) => (
                                    <tr key={p.id} className="border-t border-slate-800">
                                        <td className="px-3 py-2 text-gray-300">{formatDateUTC(p.created_at || p.fecha_pago)}</td>
                                        <td className="px-3 py-2 text-gray-400 italic">{p.notas || '-'}</td>
                                        <td className="px-3 py-2 text-right text-green-400">Q{p.monto_pagado}</td>
                                    </tr>
                                )) : <tr><td colSpan={3} className="text-center py-4 text-gray-500">No hay pagos registrados</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                <div className="text-right">
                    <span className="text-xs text-gray-400 block">Total {tab === 'ventas' ? 'Generado' : 'Pagado'}</span>
                    <span className={`text-lg font-bold ${tab === 'ventas' ? 'text-blue-400' : 'text-green-400'}`}>
                        Q{tab === 'ventas' 
                            ? data.ventas.reduce((acc, v) => acc + Number(v.monto_pendiente), 0).toFixed(2)
                            : data.pagos.reduce((acc, p) => acc + Number(p.monto_pagado), 0).toFixed(2)
                        }
                    </span>
                </div>
            </div>
        </dialog>
    )
}
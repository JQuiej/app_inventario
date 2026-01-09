'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
// Agregamos Archive y ArchiveRestore para los iconos de estado
import { Trash2, FileSpreadsheet, TrendingUp, ArrowUpDown, ArrowUp, ArrowDown, Archive, ArchiveRestore } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { agregarStock, getCategoriaNombre } from '@/actions/inventario' 
// Importamos las acciones nuevas desde tu archivo actualizado (asumiendo que es ./actions)
import { 
    crearProductoCompleto, 
    editarProducto, 
    toggleEstadoProducto, 
    getProductosPorCategoria // Usamos la nueva función que acepta el filtro
} from './actions'

import CreateProductModal from './CreateProductModal'
import EditProductModal from './EditProductModal'
import AddStockModal from './AddStockModal'
import styles from './page.module.css'

export default function ProductosPage() {
  const params = useParams()
  const rawId = params.id || params.categoriaId
  const categoriaId = Array.isArray(rawId) ? rawId[0] : rawId

  const [productos, setProductos] = useState<any[]>([])
  const [nombreCategoria, setNombreCategoria] = useState('Cargando...')
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [totalInvertido, setTotalInvertido] = useState(0)
  
  // --- NUEVO ESTADO: MOSTRAR DESCONTINUADOS ---
  const [mostrarInactivos, setMostrarInactivos] = useState(false)

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null)

  const cargarDatos = () => {
    if (!categoriaId) return
    setLoading(true)
    
    // Pasamos 'mostrarInactivos' a la función del backend
    Promise.all([
      getProductosPorCategoria(categoriaId, mostrarInactivos),
      getCategoriaNombre(categoriaId)
    ]).then(([prodData, catName]) => {
      const data = prodData || []
      setProductos(data)
      setNombreCategoria(catName || 'Inventario')
      
      // Calculamos total solo de los activos para no inflar el valor real
      const total = data
        .filter((p: any) => p.activo) 
        .reduce((acc: number, p: any) => {
            return acc + (p.stock_actual * p.costo_promedio)
        }, 0)
      setTotalInvertido(total)

      setLoading(false)
    })
  }

  // Recargamos cuando cambia la categoría O el checkbox de inactivos
  useEffect(() => {
    if (categoriaId) cargarDatos()
  }, [categoriaId, mostrarInactivos])

  // --- 1. FILTRADO ---
  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.sku?.toLowerCase().includes(busqueda.toLowerCase())
  )

  // --- 2. ORDENAMIENTO ---
  const productosOrdenados = [...productosFiltrados].sort((a, b) => {
    if (!sortConfig) return 0
    const { key, direction } = sortConfig
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'desc'
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc'
    }
    setSortConfig({ key, direction })
  }

  const handleExportExcel = () => {
    const productosConStock = productosOrdenados.filter(p => p.stock_actual > 0 && p.activo) // Solo activos en el reporte
    if (productosConStock.length === 0) return toast.error("No hay productos activos con stock")

    const dataToExport = productosConStock.map(p => ({
      Producto: p.nombre,
      SKU: p.sku || 'N/A',
      'Stock Actual': p.stock_actual,
      'Costo Promedio (Q)': p.costo_promedio,
      'Precio Venta (Q)': p.precio_venta,
      'Valor Total (Q)': p.stock_actual * p.costo_promedio
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario")
    const fecha = new Date().toLocaleDateString().replace(/\//g, '-')
    XLSX.writeFile(workbook, `Inventario_${nombreCategoria}_${fecha}.xlsx`)
    toast.success("Excel descargado correctamente")
  }

  // --- NUEVA FUNCIÓN: CAMBIAR ESTADO (SOFT DELETE) ---
  const handleToggleEstado = (id: string, nombre: string, estadoActual: boolean) => {
    const accion = estadoActual ? 'desactivar' : 'restaurar';
      
    toast(`¿${accion === 'desactivar' ? 'Descontinuar' : 'Reactivar'} ${nombre}?`, {
        description: estadoActual 
          ? "El producto se ocultará de las ventas pero mantendrá su historial."
          : "El producto volverá a estar disponible para ventas.",
        action: {
            label: "Confirmar",
            onClick: async () => {
                try {
                    await toggleEstadoProducto(id, estadoActual)
                    await cargarDatos()
                    toast.success(`Producto ${estadoActual ? 'descontinuado' : 'reactivado'}`)
                } catch (error) {
                    toast.error("Error al actualizar estado")
                }
            }
        },
        cancel: { 
        label: 'Cancelar',
        onClick: () => {}
      },
        actionButtonStyle: { backgroundColor: estadoActual ? '#ef4444' : '#22c55e' } // Rojo para desactivar, Verde para activar
    })
  }

  if (!categoriaId) return <div className={styles.container}>Cargando...</div>

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
            <span className={styles.breadcrumb}>Inventario /</span>
            <h1 className={styles.title}>{nombreCategoria}</h1>
        </div>

        <div className={styles.controls}>
          {/* CHECKBOX VER DESCONTINUADOS */}
          <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer select-none bg-[#1e293b] px-3 py-2 rounded border border-[#334155] hover:border-gray-500 transition-colors">
            <input 
                type="checkbox" 
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-0"
            />
            Ver descontinuados
          </label>

          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className={styles.searchInput}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          
          <button onClick={handleExportExcel} className={styles.excelButton} title="Exportar a Excel">
            <FileSpreadsheet size={20} />
            <span className={styles.btnText}>Excel</span>
          </button>

          <CreateProductModal 
            categoriaId={categoriaId} 
            crearProductoCompleto={async (formData) => {
                await crearProductoCompleto(formData)
                cargarDatos() 
            }} 
          />
        </div>
      </div>

      {/* TARJETA TOTAL */}
      <div style={{
        backgroundColor: '#1e293b', 
        padding: '1.5rem', 
        borderRadius: '12px', 
        border: '1px solid #334155',
        marginBottom: '2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        maxWidth: '400px'
      }}>
        <div>
            <div style={{color:'#94a3b8', fontSize:'0.9rem', fontWeight:'600', textTransform:'uppercase'}}>
                Valor del Inventario (Activos)
            </div>
            <div style={{fontSize:'2rem', fontWeight:'800', color:'#34d399', lineHeight:'1.2'}}>
                Q{totalInvertido.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
            </div>
        </div>
        <div style={{
            backgroundColor: 'rgba(52, 211, 153, 0.1)', 
            padding:'12px', 
            borderRadius:'12px',
            color: '#34d399'
        }}>
            <TrendingUp size={32} strokeWidth={2.5} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                
                <th 
                  style={{textAlign: 'center', cursor: 'pointer', userSelect: 'none'}}
                  onClick={() => handleSort('stock_actual')}
                  title="Ordenar por Stock"
                >
                  <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px'}}>
                    Stock
                    {sortConfig?.key === 'stock_actual' ? (
                      sortConfig.direction === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />
                    ) : (
                      <ArrowUpDown size={14} style={{opacity: 0.5}} />
                    )}
                  </div>
                </th>

                <th>Costo Prom.</th>
                <th>Precio Venta</th>
                <th style={{textAlign: 'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr>}
              
              {!loading && productosOrdenados.length === 0 && (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>No hay productos.</td></tr>
              )}

              {productosOrdenados.map((prod) => (
                <tr key={prod.id} style={{ opacity: prod.activo ? 1 : 0.5 }}>
                  <td>
                    <div style={{fontWeight: 'bold', fontSize: '1rem', display:'flex', alignItems:'center', gap:'8px'}}>
                        {prod.nombre}
                        {!prod.activo && <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">Inactivo</span>}
                    </div>
                    <div className={styles.sku}>{prod.sku }</div>
                  </td>
                  <td style={{textAlign: 'center'}}>
                    <span className={prod.stock_actual < 5 ? styles.badgeStockLow : styles.badgeStockHigh}>
                      {prod.stock_actual}
                    </span>
                  </td>
                  <td>Q{prod.costo_promedio?.toFixed(2) || '0.00'}</td>
                  <td className={styles.price}>Q{prod.precio_venta?.toFixed(2)}</td>
                  <td>
                    <div className={styles.actionsCell}>
                      
                      {/* Solo permitimos editar/stock si está activo */}
                      {prod.activo && (
                          <>
                            <AddStockModal 
                                producto={prod}
                                agregarStockAction={async (id, cant, cost) => {
                                await agregarStock(id, cant, cost)
                                cargarDatos() 
                                }}
                            />
                            <EditProductModal 
                                producto={prod} 
                                categoriaId={categoriaId} 
                                editarProductoAction={async (fd) => {
                                await editarProducto(fd)
                                cargarDatos()
                                }}
                            />
                          </>
                      )}

                      {/* BOTÓN DESACTIVAR / REACTIVAR */}
                      <button 
                        onClick={() => handleToggleEstado(prod.id, prod.nombre, prod.activo)}
                        className={`${styles.iconBtnDelete} transition-colors`}
                        style={{
                            color: prod.activo ? '#ef4444' : '#22c55e', // Rojo o Verde
                            borderColor: prod.activo ? '#ef4444' : '#22c55e'
                        }}
                        title={prod.activo ? "Descontinuar" : "Reactivar"}
                      >
                        {prod.activo ? <Archive size={18} /> : <ArchiveRestore size={18} />}
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
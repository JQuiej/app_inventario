'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Trash2, FileSpreadsheet, Package, TrendingUp } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { agregarStock, getProductosPorCategoria, getCategoriaNombre } from '@/actions/inventario'
import { crearProductoCompleto, eliminarProducto, editarProducto } from './actions'
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
  
  // Nuevo estado para el total
  const [totalInvertido, setTotalInvertido] = useState(0)

  const cargarDatos = () => {
    if (!categoriaId) return
    setLoading(true)
    
    Promise.all([
      getProductosPorCategoria(categoriaId),
      getCategoriaNombre(categoriaId)
    ]).then(([prodData, catName]) => {
      const data = prodData || []
      setProductos(data)
      setNombreCategoria(catName || 'Inventario')
      
      // CALCULAR TOTAL INVERTIDO: Suma de (Stock * Costo Promedio) de cada producto
      const total = data.reduce((acc: number, p: any) => {
        return acc + (p.stock_actual * p.costo_promedio)
      }, 0)
      setTotalInvertido(total)

      setLoading(false)
    })
  }

  useEffect(() => {
    if (categoriaId) cargarDatos()
  }, [categoriaId])

  const productosFiltrados = productos.filter(p => 
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
    p.sku?.includes(busqueda)
  )

  const handleExportExcel = () => {
    if (productosFiltrados.length === 0) return toast.error("No hay datos para exportar")

    const dataToExport = productosFiltrados.map(p => ({
      Producto: p.nombre,
      SKU: p.sku || 'N/A',
      'Stock Actual': p.stock_actual,
      'Costo Promedio (Q)': p.costo_promedio,
      'Precio Venta (Q)': p.precio_venta,
      'Valor Total Inventario (Q)': p.stock_actual * p.costo_promedio
    }))

    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario")

    const fecha = new Date().toLocaleDateString().replace(/\//g, '-')
    XLSX.writeFile(workbook, `Inventario_${nombreCategoria}_${fecha}.xlsx`)
    toast.success("Excel descargado correctamente")
  }

  const handleDelete = (productoId: string) => {
    toast('¿Estás seguro de eliminar este producto?', {
      description: 'Esta acción es permanente y no se puede deshacer.',
      action: {
        label: 'Eliminar',
        onClick: async () => {
          if (categoriaId) {
            try {
              await eliminarProducto(productoId, categoriaId)
              await cargarDatos() // Recargar para actualizar el total invertido
              toast.success('Producto eliminado')
            } catch (error) {
              toast.error('Error al eliminar')
            }
          }
        },
      },
      cancel: { 
        label: 'Cancelar',
        onClick: () => {}
      },
      actionButtonStyle: { backgroundColor: '#ef4444' }
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
          <input 
            type="text" 
            placeholder="Buscar producto..." 
            className={styles.searchInput}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          
          <button 
            onClick={handleExportExcel} 
            className={styles.excelButton}
            title="Exportar a Excel"
          >
            <FileSpreadsheet size={20} />
            <span className={styles.btnText}>Excel</span>
          </button>

          <CreateProductModal 
            categoriaId={categoriaId} 
            crearProductoCompleto={async (formData) => {
                await crearProductoCompleto(formData)
                cargarDatos() // Recargar para actualizar lista y total
            }} 
          />
        </div>
      </div>

      {/* --- NUEVA TARJETA DE RESUMEN DE INVERSIÓN --- */}
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
                Valor del Inventario
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
            {/* Ícono de Inversión / Crecimiento */}
            <TrendingUp size={32} strokeWidth={2.5} />
        </div>
      </div>

      <div className={styles.tableContainer}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Producto</th>
                <th style={{textAlign: 'center'}}>Stock</th>
                <th>Costo Prom.</th>
                <th>Precio Venta</th>
                <th style={{textAlign: 'center'}}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>Cargando...</td></tr>}
              
              {!loading && productosFiltrados.length === 0 && (
                <tr><td colSpan={5} style={{textAlign: 'center', padding: '2rem'}}>No hay productos.</td></tr>
              )}

              {productosFiltrados.map((prod) => (
                <tr key={prod.id}>
                  <td>
                    <div style={{fontWeight: 'bold', fontSize: '1rem'}}>{prod.nombre}</div>
                    <div className={styles.sku}>{prod.sku || '-'}</div>
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
                      <AddStockModal 
                        producto={prod}
                        agregarStockAction={async (id, cant, cost) => {
                          await agregarStock(id, cant, cost)
                          cargarDatos() // Recargar para actualizar stock y total dinero
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
                      <button 
                        onClick={() => handleDelete(prod.id)}
                        className={styles.iconBtnDelete}
                        title="Eliminar"
                      >
                        <Trash2 size={18} />
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
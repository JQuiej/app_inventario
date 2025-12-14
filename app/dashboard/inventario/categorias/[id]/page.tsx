'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Trash2, FileSpreadsheet } from 'lucide-react' // Importamos icono Excel
import * as XLSX from 'xlsx' // Importamos la librería
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
  const [nombreCategoria, setNombreCategoria] = useState('Cargando...') // Nuevo Estado
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)

  const cargarDatos = () => {
    if (!categoriaId) return
    setLoading(true)
    
    // Cargamos Productos y Nombre de Categoría en paralelo
    Promise.all([
      getProductosPorCategoria(categoriaId),
      getCategoriaNombre(categoriaId)
    ]).then(([prodData, catName]) => {
      setProductos(prodData || [])
      setNombreCategoria(catName || 'Inventario')
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

  // --- FUNCIÓN PARA EXPORTAR A EXCEL ---
  const handleExportExcel = () => {
    if (productosFiltrados.length === 0) return toast.error("No hay datos para exportar")

    // 1. Formatear datos para que se vean bonitos en Excel
    const dataToExport = productosFiltrados.map(p => ({
      Producto: p.nombre,
      SKU: p.sku || 'N/A',
      'Stock Actual': p.stock_actual,
      'Costo Promedio (Q)': p.costo_promedio,
      'Precio Venta (Q)': p.precio_venta,
      'Valor Total Inventario (Q)': p.stock_actual * p.costo_promedio // Dato extra útil
    }))

    // 2. Crear hoja de trabajo
    const worksheet = XLSX.utils.json_to_sheet(dataToExport)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inventario")

    // 3. Descargar archivo
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
              await cargarDatos()
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
        {/* AHORA MOSTRAMOS EL NOMBRE DE LA CATEGORÍA */}
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
          
          {/* BOTÓN EXCEL */}
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
                cargarDatos()
            }} 
          />
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
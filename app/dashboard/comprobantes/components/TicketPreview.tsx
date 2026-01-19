'use client'
import { X, Printer } from 'lucide-react'
import { toast } from 'sonner'
import { imprimirVoucher } from '@/utils/printer'

interface Props {
    item: any;
    config: any;
    onClose: () => void;
    onPrint?: () => void; // <--- 1. CAMBIO: Añadí '?' para hacerlo opcional
}

// 2. CAMBIO: Agregué 'onPrint' aquí abajo para poder usarlo
export default function TicketPreview({ item, config, onClose, onPrint }: Props) {
    if (!item) return null;

    const activacion = parseFloat(item.monto_activacion || 0);
    const precioDispositivo = parseFloat(item.movimientos_inventario?.precio_real_venta || 0);
    
    let descuento = 0;
    const tam = item.movimientos_inventario?.tam;
    if (tam && tam.length > 0) {
        descuento = parseFloat(tam[0].monto_pendiente || 0);
    }

    const totalVenta = precioDispositivo + activacion - descuento;

    const fechaObj = new Date(item.created_at);
    const fecha = fechaObj.toLocaleDateString('es-GT', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });

    const handlePrintHere = async () => {
        if (!config) return toast.error("Falta configuración del negocio");

        const datosParaImprimir = {
            logoUrl: config.logo_url,
            negocio: config.nombre_negocio,
            direccion: config.direccion,
            telefono: config.telefono,
            garantia: config.mensaje_garantia,
            fecha: fecha.split(',')[0],
            correlativo: item.correlativo || '---',
            cliente: item.cliente_nombre,
            dpi: item.cliente_dpi,
            producto: item.movimientos_inventario?.productos?.nombre || 'Producto',
            precioDispositivo: precioDispositivo,
            descuento: descuento,
            imei: item.imei_dispositivo,
            icc: item.icc,
            telefonoActivacion: item.telefono_activacion,
            montoActivacion: activacion,
            total: totalVenta // Aseguramos enviar el total calculado
        };

        // NOTA: Aquí se usa un ancho por defecto si se imprime desde local (fallback)
        // Idealmente siempre usarás onPrint del padre.
        toast.info("Enviando a impresora...");
        const res = await imprimirVoucher(datosParaImprimir, 48); // Asume 80mm por defecto en fallback
        if (res.error) toast.error("Error: " + res.error);
        else toast.success("Imprimiendo...");
    };

    const SolidLine = () => <div style={{ borderBottom: '2px solid #000', margin: '8px 0' }}></div>;
    const Row = ({ label, value, bold = false, size = '0.9rem' }: any) => (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: size, fontWeight: bold ? 'bold' : 'normal' }}>
            <span>{label}</span><span>{value}</span>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-white rounded-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                <button onClick={onClose} className="absolute top-2 right-2 bg-gray-100 hover:bg-gray-200 rounded-full p-2 text-gray-600 z-10"><X size={20} /></button>

                <div className="overflow-y-auto p-6 bg-gray-50 custom-scrollbar">
                    <div className="bg-white mx-auto shadow-sm" style={{ fontFamily: '"Courier New", Courier, monospace', padding: '20px', width: '320px', color: '#000', border: '1px solid #e5e7eb' }}>
                        
                        {config?.logo_url && <img src={config.logo_url} className="w-24 h-auto mx-auto mb-2 object-contain mix-blend-multiply grayscale" alt="Logo"/>}
                        <div className="text-center text-xs mb-1">{config?.direccion}</div>
                        <div className="text-center text-xs">Tel: {config?.telefono}</div>
                        <SolidLine />

                        <div className="text-center text-xs font-bold">COMPROBANTE DE GARANTÍA</div>
                        <SolidLine />

                        <Row label="Fecha:" value={fecha} size="0.8rem" />
                        <Row label="Correlativo:" value={`#${item.correlativo || 'PENDIENTE'}`} bold size="0.9rem" />
                        <SolidLine />
                        <div className="text-xs font-bold mb-1">DATOS CLIENTE:</div>
                        <div className="text-xs uppercase mb-1">{item.cliente_nombre}</div>
                        <div className="text-xs mb-2">DPI: {item.cliente_dpi}</div>
                        <SolidLine />

                        <Row label="Producto" value="Monto" bold size="0.8rem" />
                        <div className="flex justify-between items-start mt-2 text-sm">
                            <span className="w-2/3 pr-2 uppercase">{item.movimientos_inventario?.productos?.nombre}</span>
                            <span className="font-bold">Q{precioDispositivo.toFixed(2)}</span>
                        </div>
                        {item.imei_dispositivo && <div className="text-[13px] text-gray-500">IMEI: {item.imei_dispositivo}</div>}
                        {item.icc && <div className="text-[13px] text-gray-500">ICC: {item.icc}</div>}

                        {activacion > 0 && (
                            <div className="mt-2 pt-1 border-t border-dashed border-gray-300">
                                <div className="text-[13px] text-gray-500">Tel: {item.telefono_activacion}</div>
                                <div className="flex justify-between text-sm"><span>Monto Recarga</span><span>Q{activacion.toFixed(2)}</span></div>
                            </div>
                        )}

                        <SolidLine />
                        {descuento > 0 && (
                            <div className="flex justify-between text-sm font-bold text-black"><span>DESCUENTO</span><span>-Q{descuento.toFixed(2)}</span></div>
                        )}
                        <div className="flex justify-between text-xl font-bold mt-3 border-t-2 border-black pt-2"><span>TOTAL</span><span>Q{totalVenta.toFixed(2)}</span></div>
                        
                        <div className="mt-6 text-center text-[10px] whitespace-pre-wrap leading-tight opacity-80">
                            {config?.mensaje_garantia || 'Gracias por su compra.'}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex gap-3 justify-end">
                    <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-600 hover:text-gray-800">Cerrar</button>
                    <button 
                        onClick={() => {
                            if (onPrint) onPrint(); // Ahora sí funciona porque onPrint existe en el scope
                            else handlePrintHere();
                        }} 
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-2 shadow-sm"
                    > 
                        <Printer size={18} /> Imprimir Ahora
                    </button>
                </div>
            </div>
        </div>
    )
}
import { useState } from 'react';
import { imprimirVoucher } from '@/utils/printer'; // Ajusta la ruta

export default function MiPantallaDeVenta({ datosVenta }: { datosVenta: any }) {
  const [showModal, setShowModal] = useState(false);
  const [printing, setPrinting] = useState(false);

  // 1. Función que llama el botón principal
  const handleClickImprimir = () => {
    setShowModal(true);
  };

  // 2. CORRECCIÓN AQUÍ: Definimos que 'tamano' puede ser '58mm' o '80mm' (o simplemente string)
  const handleSelection = async (tamano: '58mm' | '80mm') => {
    setShowModal(false); // Cierra modal
    setPrinting(true);   // Muestra loader

    // ancho 32 chars para 58mm, 48 chars para 80mm
    const anchoCaracteres = tamano === '58mm' ? 32 : 48;

    const resultado = await imprimirVoucher(datosVenta, anchoCaracteres);

    setPrinting(false);

    if (resultado.error) {
      alert("Error: " + resultado.error + "\n\nTip: Si tienes varias impresoras iguales, apaga la que no uses o desenparéjala en la configuración de Bluetooth del teléfono.");
    } else {
      alert("Impresión enviada correctamente");
    }
  };

  return (
    <div>
      {/* Botón Principal */}
      <button 
        onClick={handleClickImprimir}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        disabled={printing}
      >
        {printing ? 'Imprimiendo...' : 'Imprimir Ticket'}
      </button>

      {/* --- EL MODAL SIMPLE --- */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-80">
            <h3 className="text-lg font-bold mb-4 text-center">Seleccione Impresora</h3>
            <p className="text-sm text-gray-500 mb-6 text-center">
              ¿Qué ancho de papel utiliza su impresora actual?
            </p>
            
            <div className="flex flex-col gap-3">
              {/* Botón 58mm */}
              <button
                onClick={() => handleSelection('58mm')}
                className="bg-gray-200 hover:bg-gray-300 py-3 rounded text-black font-semibold border-2 border-gray-400"
              >
                Pequeña (58mm)
              </button>

              {/* Botón 80mm */}
              <button
                onClick={() => handleSelection('80mm')}
                className="bg-gray-200 hover:bg-gray-300 py-3 rounded text-black font-semibold border-2 border-gray-400"
              >
                Grande (80mm)
              </button>
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="mt-4 text-red-500 text-sm w-full text-center"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
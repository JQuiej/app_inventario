// app/dashboard/comprobantes/components/ConfigForm.tsx
'use client'
import { useState } from 'react'
import { Save, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { guardarConfiguracion } from '../actions'
import styles from '../comprobantes.module.css' // Usamos los mismos estilos

interface Props {
    config: any;
    onUpdate: () => void; // Para recargar la config en el padre
}

export default function ConfigForm({ config, onUpdate }: Props) {
    const [loading, setLoading] = useState(false);

    // Usamos Server Actions directamente con FormData
    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        try {
            const result = await guardarConfiguracion(formData) as { error?: string } | undefined;
            if (result?.error) {
                toast.error(result.error);
            } else {
                toast.success("Configuración guardada correctamente");
                onUpdate(); // Recargamos los datos en el padre
            }
        } catch (error) {
            console.error(error);
            toast.error("Error al guardar configuración");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form action={handleSubmit} className={styles.card} style={{ maxWidth: '600px', margin: '0 auto' }}>
            <div className={styles.sectionTitle}>Datos del Negocio</div>

            {/* LOGO */}
            <div className={styles.inputGroup}>
                <span className={styles.label}>Logo del Negocio</span>
                <div className="flex items-center gap-4 mt-2">
                    {config?.logo_url ? (
                        <div className="relative group">
                            <img 
                                src={config.logo_url} 
                                alt="Logo actual" 
                                className="w-20 h-20 object-contain bg-gray-50 rounded border p-1" 
                            />
                        </div>
                    ) : (
                        <div className="w-20 h-20 bg-gray-100 rounded border flex items-center justify-center text-gray-400 text-xs text-center">
                            Sin Logo
                        </div>
                    )}
                    
                    <div className="flex-1">
                        <input 
                            type="file" 
                            name="logo" 
                            accept="image/*" 
                            className="block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-xs file:font-semibold
                                file:bg-blue-50 file:text-blue-700
                                hover:file:bg-blue-100
                            "
                        />
                        <p className="text-[10px] text-gray-400 mt-1">Recomendado: PNG transparente. Max 2MB.</p>
                    </div>
                </div>
            </div>

            {/* DIRECCIÓN */}
            <div className={styles.inputGroup}>
                <span className={styles.label}>Dirección</span>
                <input 
                    name="direccion" 
                    defaultValue={config?.direccion} 
                    className={styles.input}
                    placeholder="Ej: 5ta Avenida, Zona 1"
                />
            </div>

            {/* TELÉFONO */}
            <div className={styles.inputGroup}>
                <span className={styles.label}>Teléfono</span>
                <input 
                    name="telefono" 
                    defaultValue={config?.telefono} 
                    className={styles.input}
                    placeholder="Ej: 5555-1234"
                />
            </div>

            {/* MENSAJE GARANTÍA */}
            <div className={styles.inputGroup}>
                <span className={styles.label}>Mensaje Garantía (Pie de página)</span>
                <textarea 
                    name="mensaje_garantia" 
                    defaultValue={config?.mensaje_garantia} 
                    className={styles.textarea}
                    rows={4}
                    placeholder="Términos y condiciones que aparecerán al final del ticket..."
                />
            </div>

            {/* BOTÓN GUARDAR */}
            <button 
                type="submit" 
                className={styles.btnPrimary} 
                disabled={loading}
            >
                {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"/>
                ) : (
                    <><Save size={18} className="mr-2"/> GUARDAR CAMBIOS</>
                )}
            </button>
        </form>
    )
}
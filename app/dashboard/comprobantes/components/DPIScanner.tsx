// app/dashboard/comprobantes/components/DPIScanner.tsx
'use client'
import { useRef, useState, useEffect } from 'react'
import { X, RefreshCw } from 'lucide-react'
import { createWorker } from 'tesseract.js';
import { toast } from 'sonner';
import { cropRegion } from '@/utils/imageProcessing';
import styles from '../comprobantes.module.css'

interface Props {
    onDetected: (dpi: string, nombre: string) => void;
    onClose: () => void;
}

// --- COORDENADAS AMPLIADAS ---
// Hacemos las cajas más grandes para tolerar movimiento.
// Luego filtraremos la "basura" extra por software.
const REGIONS = {
    cui: {  
        x: 0.01,  y: 0.18, 
        w: 0.45,  h: 0.25   // Cubre toda la zona izquierda superior
    }, 
    name: {  
        x: 0.32,  y: 0.20, 
        w: 0.60,  h: 0.50   // Cubre centro y derecha (Apellidos y Nombres)
    }
};

export default function DPIScanner({ onDetected, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 2560 }, // 2K para nitidez en letras pequeñas
                        height: { ideal: 1440 },
                        focusMode: 'continuous'
                    } as any
                });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                toast.error("No se pudo acceder a la cámara.");
                onClose();
            }
        };
        startCamera();
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [onClose]);

    const captureAndProcess = async () => {
        const video = videoRef.current;
        if (!video) return;

        video.pause(); // Congelar imagen
        setProcessing(true);

        try {
            const videoW = video.videoWidth;
            const videoH = video.videoHeight;
            
            // Frame lógico (Caja amarilla)
            const frameW = videoW * 0.85; 
            const frameH = frameW / 1.586; 
            const frameX = (videoW - frameW) / 2;
            const frameY = (videoH - frameH) / 2;

            // 1. Recortes (usando imageProcessing con filtros)
            const imgCUI = cropRegion(
                video, 
                frameX + (frameW * REGIONS.cui.x),
                frameY + (frameH * REGIONS.cui.y),
                frameW * REGIONS.cui.w,
                frameH * REGIONS.cui.h 
            );

            const imgName = cropRegion(
                video, 
                frameX + (frameW * REGIONS.name.x),
                frameY + (frameH * REGIONS.name.y),
                frameW * REGIONS.name.w,
                frameH * REGIONS.name.h
            );

            if (imgCUI && imgName) {
                // Instanciar Tesseract
                const worker = await createWorker('spa');
                
                // --- A. PROCESAR CUI ---
                // Limitamos a solo números para evitar leer letras como "O" o "I"
                await worker.setParameters({ tessedit_char_whitelist: '0123456789' });
                const { data: { text: rawTextCUI } } = await worker.recognize(imgCUI);

                // --- B. PROCESAR NOMBRE ---
                // Limitamos a letras mayúsculas y espacios
                await worker.setParameters({ tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ ' });
                const { data: { text: rawTextName } } = await worker.recognize(imgName);

                await worker.terminate();

                // ==========================================
                // LÓGICA DE VALIDACIÓN Y LIMPIEZA ROBUSTA
                // ==========================================

                // 1. Extracción Inteligente de CUI
                // Buscamos un patrón de 13 dígitos seguidos, ignorando espacios o saltos de línea intermedios
                // Ejemplo: "2450 88999 0101" -> "2450889990101"
                const numbersOnly = rawTextCUI.replace(/\D/g, ''); 
                // El CUI en Guatemala tiene 13 dígitos. 
                // A veces OCR lee basura extra, así que buscamos la secuencia de 13 más probable.
                let finalCUI = "";
                
                if (numbersOnly.length === 13) {
                    finalCUI = numbersOnly;
                } else if (numbersOnly.length > 13) {
                    // Si hay más números, tomamos los primeros 13 que parezcan válidos (heuristicamente)
                    // O simplemente cortamos
                    finalCUI = numbersOnly.substring(0, 13); 
                }

                // 2. Extracción Inteligente de Nombre
                const forbiddenWords = [
                    'NOMBRE', 'NOMBRES', 'APELLIDO', 'APELLIDOS', 'DE', 'DEL',
                    'IDENTIFICACION', 'PERSONAL', 'DOCUMENTO', 'DPI', 'CUI',
                    'GUATEMALA', 'REPUBLICA', 'CENTROAMERICA', 'NACIONALIDAD',
                    'FECHA', 'NACIMIENTO', 'VECINDAD', 'SEXO', 'MASCULINO', 'FEMENINO'
                ];

                const nameLines = rawTextName.split('\n')
                    .map(line => line.trim().toUpperCase())
                    .filter(line => {
                        // Filtro 1: Longitud mínima de línea (evita basura como " . " o "Y")
                        if (line.length < 3) return false;

                        // Filtro 2: Eliminar palabras prohibidas exactas
                        if (forbiddenWords.includes(line)) return false;

                        // Filtro 3: Análisis léxico palabra por palabra
                        const words = line.split(' ').filter(w => w.length > 1); // Ignorar letras solas
                        if (words.length === 0) return false;

                        // Si la línea contiene demasiadas palabras prohibidas, es basura
                        const badWordsCount = words.filter(w => forbiddenWords.includes(w)).length;
                        if (badWordsCount > 0) return false;

                        return true;
                    });

                // Unimos las líneas limpias. 
                // Normalmente en el DPI: Linea 1 = Apellidos, Linea 2 = Nombres
                const finalName = nameLines.join(' ');

                // ==========================================
                // DECISIÓN FINAL
                // ==========================================
                
                if (finalCUI.length === 13) {
                    
                    if (finalName.length > 4) {
                        // ÉXITO TOTAL
                        onDetected(finalCUI, finalName);
                        toast.success("DPI escaneado exitosamente");
                        onClose();
                    } else {
                        // ÉXITO PARCIAL (Solo CUI)
                        // Es mejor devolver el CUI y dejar que escriban el nombre
                        onDetected(finalCUI, "");
                        toast.warning("CUI detectado. El nombre no era legible, ingréselo manualmente.");
                        onClose();
                    }

                } else {
                    toast.warning(`Lectura incompleta del CUI (${numbersOnly.length} dígitos encontrados). Intente mejorar la iluminación.`);
                    video.play(); // Reintentar
                }
            }
        } catch (err) {
            console.error(err);
            toast.error("Error procesando la imagen.");
            video.play();
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={styles.scannerOverlay}>
            <div className={styles.scannerHeader}>
                <span className="font-bold">Escanear DPI</span>
                <button onClick={onClose}><X size={24} /></button>
            </div>

            <div className={styles.scannerView}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '0 auto' }}>
                    <video 
                        ref={videoRef} 
                        autoPlay playsInline muted 
                        className={styles.videoElement}
                        style={{ borderRadius: '12px' }}
                    />

                    {/* MARCO GUÍA (Visualmente ajustado al DPI) */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '85%', 
                        aspectRatio: '1.586', 
                        border: '2px solid #fbbf24', 
                        borderRadius: '12px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85)'
                    }}>
                        <div className="absolute -top-8 w-full text-center text-yellow-400 font-bold text-sm">
                            ENCUADRE EL DPI COMPLETO
                        </div>

                        {/* DEBUG: Áreas de búsqueda (Opcional: Quitar en producción si molesta) */}
                        <div style={{
                            position: 'absolute',
                            left: `${REGIONS.cui.x * 100}%`,
                            top: `${REGIONS.cui.y * 100}%`,
                            width: `${REGIONS.cui.w * 100}%`,
                            height: `${REGIONS.cui.h * 100}%`,
                            border: '1px dashed rgba(255, 50, 50, 0.3)',
                        }} />
                        <div style={{
                            position: 'absolute',
                            left: `${REGIONS.name.x * 100}%`,
                            top: `${REGIONS.name.y * 100}%`,
                            width: `${REGIONS.name.w * 100}%`,
                            height: `${REGIONS.name.h * 100}%`,
                            border: '1px dashed rgba(59, 130, 246, 0.3)',
                        }} />
                    </div>
                </div>
            </div>

            <div className={styles.scannerControls}>
                <button 
                    onClick={captureAndProcess}
                    disabled={processing}
                    className={styles.btnCapture}
                >
                    {processing ? <RefreshCw className="animate-spin text-white"/> : <div className={styles.btnCaptureInner}></div>}
                </button>
            </div>
        </div>
    )
}
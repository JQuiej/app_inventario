'use client'
import { useRef, useState, useEffect } from 'react'
import { X, RefreshCw, ScanEye } from 'lucide-react'
import { createWorker, PSM } from 'tesseract.js';
import { toast } from 'sonner';
import { cropRegion } from '@/utils/imageProcessing';
import styles from '../comprobantes.module.css'

interface Props {
    onDetected: (dpi: string, nombre: string) => void;
    onClose: () => void;
}

// === CORRECCIÓN DE ZONAS (LADO DERECHO DEL DPI) ===
// El DPI tiene la foto a la izquierda (aprox 30-35% del ancho).
// Los datos están del 35% en adelante.
const ZONES = {
    // Zona del CUI: Parte superior DERECHA
    cui: { 
        x: 0.01,  y: 0.18, 
        w: 0.33,  h: 0.15,
        label: "CUI", color: "rgba(59, 130, 246, 0.5)" // Azul
    },
    // Zona de Apellidos y Nombres: Debajo del CUI, lado DERECHO
    names: { 
        x: 0.32,  y: 0.20, 
        w: 0.25,  h: 0.30 ,
        label: "APELLIDOS Y NOMBRES", color: "rgba(34, 197, 94, 0.5)" // Verde
    }
};

export default function DPIScanner({ onDetected, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [processing, setProcessing] = useState(false);
    const [statusText, setStatusText] = useState("Alinee el DPI en el marco");

    useEffect(() => {
        let stream: MediaStream | null = null;
        const startCamera = async () => {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ 
                    video: { 
                        facingMode: 'environment',
                        width: { ideal: 1920 }, 
                        height: { ideal: 1080 },
                        focusMode: 'continuous'
                    } as any
                });
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                toast.error("Error al acceder a la cámara");
                onClose();
            }
        };
        startCamera();
        return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
    }, [onClose]);

    const captureAndProcess = async () => {
        const video = videoRef.current;
        if (!video) return;

        video.pause();
        setProcessing(true);
        setStatusText("Escaneando zonas...");

        try {
            const videoW = video.videoWidth;
            const videoH = video.videoHeight;
            // Frame ratio 1.586 (Tarjeta ID estándar)
            const frameW = videoW * 0.90; 
            const frameH = frameW / 1.586;
            const frameX = (videoW - frameW) / 2;
            const frameY = (videoH - frameH) / 2;

            // Recortar ZONA CUI (Lado derecho superior)
            const imgCUI = cropRegion(
                video,
                frameX + (frameW * ZONES.cui.x),
                frameY + (frameH * ZONES.cui.y),
                frameW * ZONES.cui.w,
                frameH * ZONES.cui.h
            );

            // Recortar ZONA NOMBRES (Lado derecho medio)
            const imgNames = cropRegion(
                video,
                frameX + (frameW * ZONES.names.x),
                frameY + (frameH * ZONES.names.y),
                frameW * ZONES.names.w,
                frameH * ZONES.names.h
            );

            if (imgCUI && imgNames) {
                const worker = await createWorker('spa');
                
                // 1. LEER CUI (Solo Números)
                await worker.setParameters({
                    tessedit_char_whitelist: '0123456789',
                    tessedit_pageseg_mode: PSM.SINGLE_LINE
                });
                
                const { data: { text: rawCUI } } = await worker.recognize(imgCUI);
                const finalCUI = rawCUI.replace(/\D/g, ''); 

                if (finalCUI.length !== 13) {
                    throw new Error("No se detectan 13 dígitos en la zona azul.");
                }

                // 2. LEER NOMBRES (Solo Mayúsculas)
                await worker.setParameters({
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNÑOPQRSTUVWXYZ ', 
                    tessedit_pageseg_mode: PSM.SINGLE_BLOCK 
                });

                const { data: { text: rawNames } } = await worker.recognize(imgNames);
                await worker.terminate();

                // Limpieza de nombres
                const lines = rawNames.split('\n')
                    .map(l => l.trim())
                    .filter(l => l.length > 2); // Eliminar ruido corto

                const finalName = lines.join(' ');

                if (finalName.length < 4) {
                    toast.warning("CUI detectado, pero nombre ilegible.");
                    onDetected(finalCUI, "");
                } else {
                    toast.success("DPI Escaneado Exitosamente");
                    onDetected(finalCUI, finalName);
                }
                onClose();
            }

        } catch (err: any) {
            console.error(err);
            // Mensaje de error amigable
            const msg = err.message.includes("13 dígitos") 
                ? "Alinee mejor el CUI en la caja AZUL" 
                : "No se pudo leer. Intente mejorar la luz.";
            
            toast.error(msg);
            setStatusText("Reintentar - Verifique iluminación");
            video.play();
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className={styles.scannerOverlay}>
            <div className={styles.scannerHeader}>
                <span className="font-bold flex items-center gap-2"><ScanEye/> Escáner DPI</span>
                <button onClick={onClose} className="p-2 bg-gray-800 rounded-full"><X size={20} /></button>
            </div>

            <div className={styles.scannerView}>
                <div className="relative w-full max-w-[600px] mx-auto bg-black rounded-xl overflow-hidden shadow-2xl">
                    <video 
                        ref={videoRef} 
                        autoPlay playsInline muted 
                        className="w-full h-auto object-cover opacity-70"
                    />

                    {/* MARCO DE TARJETA (AMARILLO) */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '90%', 
                        aspectRatio: '1.586', 
                        border: '2px solid #fbbf24', 
                        borderRadius: '8px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.7)',
                        zIndex: 10
                    }}>
                        <div className="absolute -top-8 w-full text-center text-yellow-400 font-bold text-xs tracking-wider">
                            ENCUADRE TODA LA TARJETA
                        </div>

                        {/* ZONA CUI (AZUL - AHORA A LA DERECHA) */}
                        <div style={{
                            position: 'absolute',
                            left: `${ZONES.cui.x * 100}%`,
                            top: `${ZONES.cui.y * 100}%`,
                            width: `${ZONES.cui.w * 100}%`,
                            height: `${ZONES.cui.h * 100}%`,
                            border: '2px dashed #3b82f6',
                            backgroundColor: ZONES.cui.color
                        }}>
                             <span className="absolute -top-5 right-0 text-[10px] text-blue-300 font-bold bg-black/60 px-2 rounded">CUI</span>
                        </div>

                        {/* ZONA NOMBRES (VERDE - AHORA A LA DERECHA) */}
                        <div style={{
                            position: 'absolute',
                            left: `${ZONES.names.x * 100}%`,
                            top: `${ZONES.names.y * 100}%`,
                            width: `${ZONES.names.w * 100}%`,
                            height: `${ZONES.names.h * 100}%`,
                            border: '2px dashed #22c55e',
                            backgroundColor: ZONES.names.color
                        }}>
                            <span className="absolute bottom-1 right-1 text-[10px] text-green-300 font-bold bg-black/60 px-2 rounded">NOMBRES</span>
                        </div>
                    </div>
                    
                    <div className="absolute bottom-6 left-0 w-full text-center z-20 pointer-events-none">
                         <span className="inline-block px-4 py-1 bg-black/80 text-white text-sm rounded-full border border-gray-600">
                            {statusText}
                         </span>
                    </div>
                </div>
            </div>

            <div className={styles.scannerControls}>
                <button 
                    onClick={captureAndProcess}
                    disabled={processing}
                    className="flex flex-col items-center gap-2 group"
                >
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center border-4 shadow-lg transition-all ${
                        processing ? 'bg-gray-700 border-gray-500' : 'bg-white border-blue-600 hover:scale-110'
                    }`}>
                        {processing ? <RefreshCw className="animate-spin text-white"/> : <div className="w-12 h-12 bg-blue-600 rounded-full border-2 border-white"></div>}
                    </div>
                    <span className="text-gray-300 text-xs font-medium">CAPTURAR</span>
                </button>
            </div>
        </div>
    )
}
// app/dashboard/comprobantes/components/BarcodeScanner.tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { Html5Qrcode, Html5QrcodeSupportedFormats, Html5QrcodeScannerState } from "html5-qrcode"
import { toast } from 'sonner'
import styles from '../comprobantes.module.css'

interface Props {
    onDetected: (code: string) => void;
    onClose: () => void;
}

export default function BarcodeScanner({ onDetected, onClose }: Props) {
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const [isScanning, setIsScanning] = useState(true);

    useEffect(() => {
        let isMounted = true;
        const elementId = "reader";

        const startScanner = async () => {
            if (!scannerRef.current) {
                scannerRef.current = new Html5Qrcode(elementId, false);
            }
            const html5QrCode = scannerRef.current;

            try {
                // --- CONFIGURACIÓN CORREGIDA ---
                const config = { 
                    fps: 10, 
                    
                    formatsToSupport: [ 
                        Html5QrcodeSupportedFormats.CODE_128,
                        Html5QrcodeSupportedFormats.EAN_13,
                        Html5QrcodeSupportedFormats.CODE_39,
                        Html5QrcodeSupportedFormats.ITF
                    ]
                };

                if (html5QrCode.getState() === Html5QrcodeScannerState.NOT_STARTED) {
                    await html5QrCode.start(
                        { facingMode: "environment" }, 
                        config,
                        (decodedText) => {
                            if (!isMounted) return;
                            const cleanCode = decodedText.replace(/[^0-9]/g, '');
                            
                            if (cleanCode.length >= 14 && cleanCode.length <= 16) {
                                html5QrCode.pause(); 
                                setIsScanning(false);
                                onDetected(cleanCode);
                                toast.success(`Leído: ${cleanCode}`);
                            }
                        },
                        () => {} 
                    );
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error cámara:", err);
                    toast.error("No se pudo iniciar la cámara.");
                }
            }
        };

        const timer = setTimeout(() => { startScanner(); }, 300);

        return () => {
            isMounted = false;
            clearTimeout(timer);
            if (scannerRef.current) {
                try {
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        scannerRef.current.stop()
                            .then(() => scannerRef.current?.clear())
                            .catch(err => console.warn("Stop error:", err));
                    } else {
                        scannerRef.current.clear();
                    }
                } catch(e) { console.error(e) }
            }
        };
    }, [onDetected]);

    return (
        <div className={styles.scannerOverlay}>
            <div className={styles.scannerHeader}>
                <span className="font-bold">Escáner IMEI</span>
                <button onClick={onClose}><X size={24} /></button>
            </div>

            <div className={styles.scannerView}>
                <div style={{ position: 'relative', width: '100%', maxWidth: '400px', margin: '0 auto' }}>
                    
                    {/* DIV donde se inyecta el video */}
                    {/* IMPORTANTE: Height auto para respetar la relación de aspecto del celular */}
                    <div 
                        id="reader" 
                        style={{ 
                            width: '100%', 
                            borderRadius: '12px', 
                            overflow: 'hidden', 
                            background: '#000',
                            minHeight: '300px' // Altura mínima para que no colapse cargando
                        }}
                    ></div>

                    {/* --- TU RECUADRO ROJO (VISUAL) --- */}
                    <div style={{
                        position: 'absolute',
                        top: '50%', left: '50%',
                        transform: 'translate(-50%, -50%)',
                        width: '80%', height: '120px', 
                        border: '2px solid red', 
                        borderRadius: '8px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)', 
                        zIndex: 10, 
                        pointerEvents: 'none'
                    }}>
                        <div style={{
                            width: '100%', height: '2px', background: 'red',
                            position: 'absolute', top: '50%',
                            animation: 'scan 2s infinite'
                        }} />
                    </div>

                    {isScanning && (
                        <div className="text-white text-center p-4 absolute bottom-0 w-full z-20">Iniciando cámara...</div>
                    )}
                </div>
            </div>
            
            <div className={styles.scannerControls}>
                <p className="text-gray-400 text-sm">Centra el código de barras</p>
            </div>

            {/* --- CSS CORRECCIONES --- */}
            <style jsx global>{`
                @keyframes scan {
                    0% { top: 10%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 90%; opacity: 0; }
                }

                /* 1. Ocultar SIEMPRE cualquier canvas que genere la librería (el cuadro verde) */
                #reader canvas {
                    display: none !important;
                }

                /* 2. Forzar que el video ocupe el espacio correctamente */
                #reader video {
                    width: 100% !important;
                    height: auto !important;
                    object-fit: cover;
                    display: block;
                }
            `}</style>
        </div>
    )
}
// utils/imageProcessing.ts

/**
 * Recorta una región, la convierte a escala de grises y aumenta el contraste
 * para facilitar la lectura OCR.
 */
export const cropRegion = (
    source: CanvasImageSource,
    x: number,
    y: number,
    w: number,
    h: number
): string | null => {
    try {
        const canvas = document.createElement('canvas');
        // Aumentamos un poco el tamaño del canvas de salida para mejor resolución
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) return null;

        // --- MEJORA DE IMAGEN PARA OCR ---
        // 1. Fondo blanco/negro (grayscale)
        // 2. Alto contraste (contrast)
        // 3. Brillo ajustado para eliminar sombras
        ctx.filter = 'grayscale(100%) contrast(200%) brightness(150%)';

        // Dibujar solo la parte seleccionada con los filtros aplicados
        ctx.drawImage(source, x, y, w, h, 0, 0, w, h);

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error("Error procesando imagen:", error);
        return null;
    }
};
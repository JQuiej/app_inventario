// utils/imageProcessing.ts

/**
 * Recorta, escala a grises y aplica un umbral (Binarización)
 * para dejar la imagen en blanco y negro puro.
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
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        
        if (!ctx) return null;

        // 1. Dibujar imagen original recortada
        ctx.drawImage(source, x, y, w, h, 0, 0, w, h);

        // 2. Obtener los datos de los píxeles (RAW)
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        // 3. Algoritmo de Binarización (Threshold)
        // Convertimos a escala de grises y si es más oscuro que el umbral -> negro, sino -> blanco
        const threshold = 110; // Ajustable: 100-130 suele funcionar bien para DPIs

        for (let i = 0; i < data.length; i += 4) {
            // Escala de grises por luminancia
            const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            
            // Aplicar umbral (Blanco o Negro puro)
            const value = grayscale < threshold ? 0 : 255;

            data[i] = value;     // R
            data[i + 1] = value; // G
            data[i + 2] = value; // B
            // data[i+3] es Alpha, no lo tocamos
        }

        // 4. Poner los datos procesados de vuelta
        ctx.putImageData(imageData, 0, 0);

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error("Error procesando imagen:", error);
        return null;
    }
};
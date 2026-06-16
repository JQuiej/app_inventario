// utils/imageProcessing.ts

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

        ctx.drawImage(source, x, y, w, h, 0, 0, w, h);

        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;

        const threshold = 110;

        for (let i = 0; i < data.length; i += 4) {
            const grayscale = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
            const value = grayscale < threshold ? 0 : 255;
            data[i] = value;
            data[i + 1] = value;
            data[i + 2] = value;
        }

        ctx.putImageData(imageData, 0, 0);

        return canvas.toDataURL('image/png');
    } catch (error) {
        console.error("Error procesando imagen:", error);
        return null;
    }
};

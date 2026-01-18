// utils/screenshotExtractor.ts
import { createWorker, PSM } from 'tesseract.js';

interface ExtractedData {
    telefono?: string;
    dpi?: string;
    icc?: string;
    imei?: string;
    error?: string;
}

// --- 1. ALGORITMO DE LUHN (Validación IMEI) ---
const isValidIMEI = (imei: string): boolean => {
    if (imei.length !== 15 || !/^\d+$/.test(imei)) return false;
    let sum = 0;
    let shouldDouble = false;
    for (let i = imei.length - 1; i >= 0; i--) {
        let digit = parseInt(imei.charAt(i));
        if (shouldDouble) {
            digit *= 2;
            if (digit > 9) digit -= 9;
        }
        sum += digit;
        shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
};

// --- 2. LIMPIEZA DE ERRORES OCR ---
const cleanOCRNumber = (text: string): string => {
    return text
        .toUpperCase()
        .replace(/O/g, '0')
        .replace(/D/g, '0')
        .replace(/I/g, '1')
        .replace(/L/g, '1')
        .replace(/Z/g, '2')
        .replace(/S/g, '5')
        .replace(/B/g, '8')
        .replace(/G/g, '6')
        .replace(/\s+/g, '') 
        .replace(/-/g, '') 
        .replace(/\./g, '')
        .replace(/[^0-9]/g, '');
};

export const extractDataFromScreenshot = async (imageFile: File): Promise<ExtractedData> => {
    const worker = await createWorker('spa'); 

    try {
        await worker.setParameters({
            tessedit_pageseg_mode: PSM.AUTO, 
        });

        const { data: { text: rawText } } = await worker.recognize(imageFile);
        await worker.terminate();

        const text = rawText.toUpperCase();
        console.log("OCR Texto:", text); 

        const results: ExtractedData = {};

        // 1. TELÉFONO
        const phoneRegex = /(?:ASIGNADO|TELEFONO|NÚMERO|NUMERO)[\s\S]{0,25}?(\d[\d\s]{6,12})(?!\d)/i;
        const phoneMatch = text.match(phoneRegex);
        if (phoneMatch) {
            const clean = cleanOCRNumber(phoneMatch[1]);
            if (clean.length === 8) results.telefono = clean;
        }

        // 2. DPI
        const dpiRegex = /(?:DOCUMENTO|DPI|CUI)[\s\S]{0,25}?(\d[\d\s]{12,20})(?!\d)/i;
        const dpiMatch = text.match(dpiRegex);
        if (dpiMatch) {
            const clean = cleanOCRNumber(dpiMatch[1]);
            if (clean.length >= 13) results.dpi = clean.substring(0, 13);
        }

        // 3. ICC (CORREGIDO)
        // Cambio clave: Quitamos \w para que NO lea letras. 
        // Solo aceptamos '89' seguido de dígitos o espacios. Se detendrá al ver "IMEI" u otra etiqueta.
        const iccRegex = /(?:SIM|ICCID|ICC)[\s\S]{0,25}?((?:89[\d\s]{16,25}))/i;
        const iccMatch = text.match(iccRegex);
        if (iccMatch) {
            let clean = cleanOCRNumber(iccMatch[1]);
            
            // Seguridad extra: Un ICCID nunca tiene más de 20 dígitos (normalmente 19).
            // Si tiene más, es porque se pegó el IMEI. Cortamos a 19.
            if (clean.length > 19) {
                clean = clean.substring(0, 19);
            }
            
            // Validación mínima (89 + 16 dígitos = 18 min)
            if (clean.length >= 18) results.icc = clean;
        }

        // 4. IMEI (MANTENEMOS LA VERSIÓN QUE YA FUNCIONA)
        const imeiLabelRegex = /(?:IMEI|IME1|1ME1|IMEL)(?:[:\.\s]*)([\s\S]{1,60})/i;
        const imeiLabelMatch = text.match(imeiLabelRegex);
        
        if (imeiLabelMatch && imeiLabelMatch[1]) {
            const candidateBlock = cleanOCRNumber(imeiLabelMatch[1]);
            const strictMatch = candidateBlock.match(/(?:35|86|99)\d{13}/);
            
            if (strictMatch && isValidIMEI(strictMatch[0])) {
                results.imei = strictMatch[0];
            } else {
                const looseMatch = candidateBlock.match(/\d{15}/);
                if (looseMatch && isValidIMEI(looseMatch[0])) {
                    results.imei = looseMatch[0];
                }
            }
        }

        // Fallback IMEI
        if (!results.imei) {
            const allTextClean = cleanOCRNumber(text);
            const fallbackMatches = allTextClean.matchAll(/(?:35|86|99)\d{13}/g);
            for (const match of fallbackMatches) {
                if (isValidIMEI(match[0])) {
                    results.imei = match[0];
                    break;
                }
            }
        }

        if (!results.telefono && !results.dpi && !results.icc && !results.imei) {
             return { error: "No se encontraron datos válidos." };
        }

        return results;

    } catch (err: any) {
        console.error(err);
        await worker.terminate();
        return { error: "Error al leer imagen: " + err.message };
    }
};
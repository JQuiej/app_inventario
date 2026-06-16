// utils/screenshotExtractor.ts
import { createWorker, PSM } from 'tesseract.js'

export interface ExtractedData {
    telefono?: string
    dpi?: string
    icc?: string
    imei?: string
    error?: string
}

// ── Luhn check para IMEI ────────────────────────────────────────────────────
const isValidIMEI = (imei: string): boolean => {
    if (imei.length !== 15 || !/^\d+$/.test(imei)) return false
    let sum = 0, shouldDouble = false
    for (let i = imei.length - 1; i >= 0; i--) {
        let d = parseInt(imei[i])
        if (shouldDouble) { d *= 2; if (d > 9) d -= 9 }
        sum += d
        shouldDouble = !shouldDouble
    }
    return sum % 10 === 0
}

// Limpia SOLO dígitos de una cadena corta (confusiones comunes de OCR)
const cleanDigits = (s: string): string =>
    s
        .replace(/[Oo]/g, '0')
        .replace(/[Il|]/g, '1')
        .replace(/[Zz]/g, '2')
        .replace(/[Ss]/g, '5')
        .replace(/[Bb]/g, '8')
        .replace(/[Gg]/g, '6')
        .replace(/[\s\-\.,:]/g, '')
        .replace(/[^0-9]/g, '')

// ── Ampliar imagen 2× para mejorar precisión de Tesseract ──────────────────
// No invertir ni binarizar: el card blanco con texto oscuro ya es ideal para OCR.
const upscaleImage = (imageFile: File): Promise<File> =>
    new Promise((resolve) => {
        const img = new Image()
        const url = URL.createObjectURL(imageFile)

        img.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width  = img.width  * 2
            canvas.height = img.height * 2
            const ctx = canvas.getContext('2d')!
            // Desactivar suavizado para mantener bordes nítidos
            ctx.imageSmoothingEnabled = false
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
            URL.revokeObjectURL(url)

            canvas.toBlob(
                (blob) => resolve(blob
                    ? new File([blob], 'ocr_input.png', { type: 'image/png' })
                    : imageFile),
                'image/png'
            )
        }

        img.onerror = () => resolve(imageFile)
        img.src = url
    })

// ── Unir números del ICC que se parten en 2 líneas ─────────────────────────
// Ej: "89502023022053342\n32" → "8950202302205334232"
const joinSplitNumbers = (text: string): string =>
    text.replace(/(\d+)\r?\n(\d+)/g, '$1$2')

// ── Extractor principal ─────────────────────────────────────────────────────
export const extractDataFromScreenshot = async (imageFile: File): Promise<ExtractedData> => {
    const processedFile = await upscaleImage(imageFile)
    const worker = await createWorker('spa')

    try {
        // SINGLE_COLUMN: ideal para pantallas de confirmación con layout vertical
        await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_COLUMN })

        const { data: { text: rawText } } = await worker.recognize(processedFile)
        await worker.terminate()

        const text = joinSplitNumbers(rawText)
        const upper = text.toUpperCase()
        console.log('[OCR] texto crudo:\n', text)

        const results: ExtractedData = {}

        // ── 1. TELÉFONO (8 dígitos) ──────────────────────────────────────
        const phoneMatch = upper.match(
            /(?:ASIGNADO|N[UÚ]MERO\s+ASIGNADO|TEL[EÉ]FONO|L[IÍ]NEA)[^\d]{0,50}(\d[\d\s\-]{5,13})/
        )
        if (phoneMatch) {
            const clean = cleanDigits(phoneMatch[1])
            if (clean.length === 8) results.telefono = clean
        }

        // ── 2. DPI (13 dígitos) ──────────────────────────────────────────
        const dpiMatch = upper.match(
            /(?:DOCUMENTO|DPI|CUI)[^\d]{0,60}(\d[\d\s]{11,18})/
        )
        if (dpiMatch) {
            const clean = cleanDigits(dpiMatch[1])
            if (clean.length >= 13) results.dpi = clean.substring(0, 13)
        }

        // ── 3. ICC / SIM (18-20 dígitos, siempre empieza con 89) ────────
        // Estrategia A: en el texto SIN espacios buscar 89 + 16-18 dígitos
        // (resuelve el problema de ICC dividido en 2 líneas)
        const textNoSpaces = upper.replace(/\s/g, '')
        const iccA = textNoSpaces.match(/89\d{16,18}/)
        if (iccA) {
            results.icc = iccA[0].substring(0, 19)
        } else {
            // Estrategia B: buscar cerca de la etiqueta SIM/ICC
            const iccB = upper.match(/(?:SIM|ICCID|ICC)[^\d]{0,40}(89[\d\s]{17,26})/)
            if (iccB) {
                const clean = cleanDigits(iccB[1])
                if (clean.length >= 18) results.icc = clean.substring(0, 19)
            }
        }

        // ── 4. IMEI (15 dígitos validado con Luhn) ───────────────────────
        // Buscar en la zona de texto DESPUÉS de la etiqueta IMEI
        const imeiIdx = upper.search(/IMEI/)
        if (imeiIdx !== -1) {
            // Tomar los 80 caracteres tras la etiqueta
            const zone = upper.substring(imeiIdx, imeiIdx + 80)
            // Extraer todos los grupos de dígitos de esa zona
            const groups = zone.match(/[\d\s\-]{13,20}/g) || []
            for (const g of groups) {
                const clean = cleanDigits(g)
                // Buscar secuencias de 15 dígitos dentro del grupo limpio
                const seqs = clean.match(/\d{15}/g) || []
                for (const seq of seqs) {
                    if (isValidIMEI(seq)) { results.imei = seq; break }
                }
                if (results.imei) break
            }
        }

        // Fallback IMEI: buscar en todo el texto sin espacios secuencias de 15 dígitos
        if (!results.imei) {
            const candidates = textNoSpaces.match(/\d{15}/g) || []
            for (const c of candidates) {
                if (isValidIMEI(c)) { results.imei = c; break }
            }
        }

        console.log('[OCR] resultados:', results)

        if (!results.telefono && !results.dpi && !results.icc && !results.imei) {
            return { error: 'No se encontraron datos válidos en la imagen.' }
        }

        return results

    } catch (err: any) {
        console.error('[OCR] error:', err)
        await worker.terminate()
        return { error: 'Error al leer imagen: ' + err.message }
    }
}

// app/dashboard/comprobantes/utils/printer.ts

// --- COMANDOS ESC/POS ---
const ESC = 0x1B;
const GS = 0x1D;
const LF = 0x0A; 

// FORMATO DE TEXTO
const SET_PC437 = [ESC, 0x74, 0x00]; 
const T_NORMAL = [ESC, 0x21, 0x00]; 
const T_BOLD = [ESC, 0x45, 0x01];
const T_NO_BOLD = [ESC, 0x45, 0x00];
const T_DOUBLE_H = [ESC, 0x21, 0x10];

// ALINEACIÓN
const A_LEFT = [ESC, 0x61, 0x00];
const A_CENTER = [ESC, 0x61, 0x01];
const A_RIGHT = [ESC, 0x61, 0x02];

const CUT_PAPER = [GS, 0x56, 0x41, 0x03]; 

// --- UTILIDADES ---

function encodeText(text: string): number[] {
    const replacements: { [key: string]: string } = {
        'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u',
        'Á': 'A', 'É': 'E', 'Í': 'I', 'Ó': 'O', 'Ú': 'U',
        'ñ': 'n', 'Ñ': 'N', 'ü': 'u', 'Ü': 'U'
    };
    const cleanText = text.replace(/[áéíóúÁÉÍÓÚñÑüÜ]/g, char => replacements[char] || char);
    const bytes: number[] = [];
    for (let i = 0; i < cleanText.length; i++) {
        let code = cleanText.charCodeAt(i);
        if (code > 127) code = 0x20; 
        bytes.push(code);
    }
    return bytes;
}

// 1. DIBUJAR LÍNEA (Dinámica según ancho)
function drawLine(width: number) {
    const line = '-'.repeat(width);
    return [...encodeText(line), LF];
}

// 2. TEXTO JUSTIFICADO (Dinámico)
function padPair(left: string, right: string, width: number) {
    const space = width - (left.length + right.length);
    if (space < 1) {
        // Si no cabe, imprime en dos líneas
        return [
            ...encodeText(left), LF, 
            ...A_RIGHT, ...encodeText(right), LF, ...A_LEFT 
        ];
    }
    const line = left + ' '.repeat(space) + right;
    return [...encodeText(line), LF];
}

// 3. WORD WRAP (Dinámico)
function getWrappedBytes(text: string, width: number): number[] {
    const buffer: number[] = [];
    const cleanText = text.replace(/[áéíóúñ]/gi, (c) => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n'}[c.toLowerCase()] || c));
    const words = cleanText.split(' ');
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length < width) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            if (currentLine) buffer.push(...encodeText(currentLine), LF);
            currentLine = word;
        }
    });
    if (currentLine) buffer.push(...encodeText(currentLine), LF);
    return buffer;
}

// Word Wrap específico para Producto + Precio
function printProductWithPrice(name: string, priceStr: string, width: number) {
    const buffer: number[] = [];
    const cleanName = name.replace(/[áéíóúñ]/gi, (c) => ({'á':'a','é':'e','í':'i','ó':'o','ú':'u','ñ':'n'}[c.toLowerCase()] || c));
    const words = cleanName.split(' ');
    let currentLine = '';
    const lines: string[] = [];

    words.forEach(word => {
        if ((currentLine + word).length < width) {
            currentLine += (currentLine ? ' ' : '') + word;
        } else {
            lines.push(currentLine);
            currentLine = word;
        }
    });
    if (currentLine) lines.push(currentLine);

    for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i];
        const isLastLine = (i === lines.length - 1);

        if (isLastLine) {
            if ((lineText.length + priceStr.length + 1) <= width) {
                buffer.push(...padPair(lineText, priceStr, width));
            } else {
                buffer.push(...encodeText(lineText), LF);
                buffer.push(...padPair('', priceStr, width));
            }
        } else {
            buffer.push(...encodeText(lineText), LF);
        }
    }
    return buffer;
}

async function getLogoBytes(imageUrl: string): Promise<Uint8Array | null> {
    return new Promise(async (resolve) => {
        try {
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const objectURL = URL.createObjectURL(blob);
            const img = new Image();
            img.src = objectURL;
            img.onload = () => {
                URL.revokeObjectURL(objectURL);
                const canvas = document.createElement('canvas');
                // IMPORTANTE: 384px es seguro para 58mm. 
                const MAX_WIDTH = 384; 
                const scale = MAX_WIDTH / img.width;
                const width = MAX_WIDTH;
                const height = Math.floor(img.height * scale);
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if(!ctx) { resolve(null); return; }
                ctx.fillStyle = 'white'; ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
                const imgData = ctx.getImageData(0, 0, width, height);
                const data = imgData.data;
                const bytes: number[] = [];
                bytes.push(0x1D, 0x76, 0x30, 0x00); 
                const widthBytes = width / 8; 
                bytes.push(widthBytes % 256); bytes.push(Math.floor(widthBytes / 256));
                bytes.push(height % 256); bytes.push(Math.floor(height / 256));
                for(let y = 0; y < height; y++) {
                    for(let x = 0; x < widthBytes; x++) {
                        let byte = 0;
                        for(let bit = 0; bit < 8; bit++) {
                            const pixelX = x * 8 + bit;
                            const offset = (y * width + pixelX) * 4;
                            const brightness = (data[offset] + data[offset+1] + data[offset+2]) / 3;
                            if (brightness < 128 && data[offset+3] > 128) byte |= (1 << (7 - bit));
                        }
                        bytes.push(byte);
                    }
                }
                resolve(new Uint8Array(bytes));
            };
            img.onerror = () => resolve(null);
        } catch { resolve(null); }
    });
}

async function sendDataInChunks(characteristic: any, data: Uint8Array) {
    const CHUNK_SIZE = 50; 
    for (let i = 0; i < data.byteLength; i += CHUNK_SIZE) {
        const chunk = data.slice(i, i + CHUNK_SIZE);
        await characteristic.writeValue(chunk);
        await new Promise(resolve => setTimeout(resolve, 30)); 
    }
}

// --- MAIN (ACTUALIZADO: Recibe anchoPapel) ---
export const imprimirVoucher = async (datos: any, anchoPapel: number) => {
    let device: any = null;
    try {
        if (!(navigator as any).bluetooth) {
            throw new Error('Bluetooth no disponible. Use Chrome en Android/PC.');
        }
        
        device = await (navigator as any).bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb']
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        let buffer: number[] = [];
        
        buffer.push(ESC, 0x40); 
        buffer.push(...SET_PC437); 

        // 1. LOGO
        if(datos.logoUrl) {
            const logoBytes = await getLogoBytes(datos.logoUrl);
            if(logoBytes) {
                buffer.push(...A_CENTER);
                await sendDataInChunks(characteristic, new Uint8Array([...buffer, ...Array.from(logoBytes)]));
                buffer = []; 
            }
        }

        // --- CUERPO DEL TICKET (Todo usa anchoPapel) ---
        buffer.push(...A_CENTER);
        if(datos.direccion) {
            buffer.push(...getWrappedBytes(datos.direccion, anchoPapel));
        }
        
        if(datos.telefono) buffer.push(...encodeText('Tel: ' + datos.telefono), LF);
        buffer.push(...drawLine(anchoPapel)); 
        buffer.push(...T_BOLD);
        buffer.push(...encodeText('COMPROBANTE DE GARANTIA'), LF); // Sin tilde para compatibilidad
        buffer.push(...T_NO_BOLD);
        
        buffer.push(...drawLine(anchoPapel)); 

        buffer.push(...A_LEFT);
        buffer.push(...padPair('Fecha:', datos.fecha, anchoPapel));
        buffer.push(...padPair('Correlativo:', `${datos.correlativo || '---'}`, anchoPapel));
        
        buffer.push(...drawLine(anchoPapel)); 
        buffer.push(...padPair('Cliente:', ' ', anchoPapel));
        buffer.push(...getWrappedBytes(datos.cliente, anchoPapel));
        buffer.push(...getWrappedBytes('DPI: ' + datos.dpi, anchoPapel));
        
        buffer.push(...drawLine(anchoPapel)); 

        buffer.push(...T_BOLD);
        buffer.push(...padPair('Producto', 'Total', anchoPapel));
        buffer.push(...T_NO_BOLD);
        
        const precioDisp = parseFloat(datos.precioDispositivo) || 0;
        const textoPrecio = `Q${precioDisp.toFixed(2)}`;
        // Usamos la nueva función con anchoPapel
        buffer.push(...printProductWithPrice(datos.producto, textoPrecio, anchoPapel));

        if(datos.imei) buffer.push(...encodeText(`IMEI: ${datos.imei}`), LF);
        if(datos.icc) buffer.push(...encodeText(`ICC: ${datos.icc}`), LF);

        const precioAct = parseFloat(datos.montoActivacion) || 0;
        if(datos.telefonoActivacion) {
            buffer.push(...encodeText(`Tel: ${datos.telefonoActivacion}`), LF);
            buffer.push(...padPair('Monto Recarga', `Q${precioAct.toFixed(2)}`, anchoPapel));
        }

        buffer.push(...drawLine(anchoPapel)); 

        const montoDescuento = parseFloat(datos.descuento) || 0;
        if (montoDescuento > 0) {
            buffer.push(...T_BOLD);
            buffer.push(...padPair('DESCUENTO', `-Q${montoDescuento.toFixed(2)}`, anchoPapel));
            buffer.push(...T_NO_BOLD);
            buffer.push(...drawLine(anchoPapel)); 
        } 

        const granTotal = parseFloat(datos.total);
        
        buffer.push(...T_DOUBLE_H, ...T_BOLD);
        buffer.push(...padPair('TOTAL', `Q${granTotal.toFixed(2)}`, anchoPapel));
        buffer.push(...T_NORMAL);

        buffer.push(...drawLine(anchoPapel)); 

        buffer.push(...A_CENTER);
        if(datos.garantia) {
            buffer.push(...getWrappedBytes(datos.garantia, anchoPapel));
        } else {
            buffer.push(...encodeText('Gracias por su compra'), LF);
        }
        
        buffer.push(LF, LF, LF);
        buffer.push(...CUT_PAPER);

        const finalBuffer = new Uint8Array(buffer);
        await sendDataInChunks(characteristic, finalBuffer);

        setTimeout(() => { if (device && device.gatt.connected) device.gatt.disconnect(); }, 1500);
        return { success: true };

    } catch (error: any) {
        if (device && device.gatt && device.gatt.connected) device.gatt.disconnect();
        return { error: error.message || 'Error de conexión' };
    }
}
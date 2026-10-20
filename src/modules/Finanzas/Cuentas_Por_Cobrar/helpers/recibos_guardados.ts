import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * Recibos de cobranza en PDF guardados en el servidor.
 * Carpeta: RUTA_RECIBOS_PAGOS (por default C:\saher\recibos-pagos). Un archivo por recibo: <numero>.pdf, con un
 * <numero>.sha1 al lado que guarda la "huella" de los datos con los que se generó: si el recibo cambia (se cancela un
 * documento, se corrige algo) la huella ya no coincide y el PDF se vuelve a generar.
 */
export function carpetaRecibos(): string {
    const carpeta = process.env.RUTA_RECIBOS_PAGOS?.trim() || 'C:\\saher\\recibos-pagos';
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
    return carpeta;
}

// El número de recibo (p. ej. "FRF_15042") se usa como nombre de archivo: se limpian los caracteres no permitidos
const nombreSeguro = (numero: string) => String(numero).trim().replace(/[^A-Za-z0-9._-]/g, '_');

export const huellaDatos = (datos: unknown) => crypto.createHash('sha1').update(JSON.stringify(datos)).digest('hex');

export function leerReciboGuardado(numero: string, huella: string): Buffer | null {
    try {
        const base = path.join(carpetaRecibos(), nombreSeguro(numero));
        if (!fs.existsSync(base + '.pdf') || !fs.existsSync(base + '.sha1')) return null;
        if (fs.readFileSync(base + '.sha1', 'utf8').trim() !== huella) return null;   // el recibo cambió: hay que regenerarlo
        return fs.readFileSync(base + '.pdf');
    } catch {
        return null;
    }
}

export function guardarRecibo(numero: string, buffer: Buffer, huella: string): string {
    const base = path.join(carpetaRecibos(), nombreSeguro(numero));
    fs.writeFileSync(base + '.pdf', buffer);
    fs.writeFileSync(base + '.sha1', huella);
    return base + '.pdf';
}

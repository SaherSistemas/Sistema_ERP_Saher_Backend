import path from 'path';
import fs   from 'fs';

// Ruta raíz de los PDFs de remisiones.
// Configurable vía variable de entorno RUTA_REMISIONES_PDFS.
// Por defecto crea la carpeta `remisiones/pdfs/` junto a la carpeta `facturacion/`.
export const RUTA_REMISIONES_PDFS: string =
    process.env.RUTA_REMISIONES_PDFS ??
    path.join(__dirname, '../../../../../remisiones/pdfs');

/**
 * Guarda el buffer PDF en disco con el nombre `{id_remision}.pdf`.
 * Crea la carpeta si no existe.
 * Devuelve la ruta absoluta del archivo.
 */
export function guardarRemisionPdf(id_remision: string, buffer: Buffer): string {
    if (!fs.existsSync(RUTA_REMISIONES_PDFS)) {
        fs.mkdirSync(RUTA_REMISIONES_PDFS, { recursive: true });
    }
    const rutaPdf = path.join(RUTA_REMISIONES_PDFS, `${id_remision}.pdf`);
    fs.writeFileSync(rutaPdf, buffer);
    return rutaPdf;
}

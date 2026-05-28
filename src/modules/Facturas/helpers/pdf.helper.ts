import fs from 'fs';
import path from 'path';
import { facturapiClient } from '../../../helpers/facturapi.helper';

export const RUTA_FACTURACION = process.env.RUTA_FACTURACION ?? path.join(__dirname, '../../../../facturacion');
export const RUTA_PDFS        = path.join(RUTA_FACTURACION, 'pdfs');

export async function descargarPdf(facturapiId: string): Promise<string> {
    if (!fs.existsSync(RUTA_PDFS)) fs.mkdirSync(RUTA_PDFS, { recursive: true });
    const rutaPdf = path.join(RUTA_PDFS, `${facturapiId}.pdf`);
    const stream  = await (facturapiClient.invoices as any).downloadPdf(facturapiId);
    await new Promise<void>((resolve, reject) => {
        const file = fs.createWriteStream(rutaPdf);
        stream.pipe(file);
        file.on('finish', resolve);
        file.on('error', reject);
    });
    return rutaPdf;
}

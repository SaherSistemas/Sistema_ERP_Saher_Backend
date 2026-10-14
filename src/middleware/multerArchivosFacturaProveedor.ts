import path from 'path';
import multer from 'multer';

// Carpeta donde se guardan el PDF y el XML de las facturas de proveedor. Dentro hay dos carpetas:
//   <RUTA>\pdf\<folio>.pdf   y   <RUTA>\xmls\<folio>.xml
// Por defecto C:\saher\facturasproveedor del servidor; se puede cambiar con RUTA_FACTURAS_PROVEEDOR
// (por ejemplo una ruta de red: \\salazar-server\saher\facturasproveedor).
export const RUTA_FACTURAS_PROVEEDOR =
    process.env.RUTA_FACTURAS_PROVEEDOR ?? 'C:\\saher\\facturasproveedor';

export const SUBCARPETA_ARCHIVO = { pdf: 'pdf', xml: 'xmls' } as const;

// El archivo llega en memoria: el nombre final (el folio de la factura) lo pone el controlador.
export const uploadArchivosFacturaProveedor = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB por archivo
    fileFilter: (_req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const ok = (file.fieldname === 'pdf' && ext === '.pdf') || (file.fieldname === 'xml' && ext === '.xml');
        cb(null, ok);
    },
}).fields([{ name: 'pdf', maxCount: 1 }, { name: 'xml', maxCount: 1 }]);

import multer from 'multer';
import path from 'path';

// OJO: PON AQUÍ LA RUTA REAL DE LA CARPETA QUE PUBLICA ESA URL
// Ejemplo típico en hosting Linux (ajusta a lo que tengas):
// const pruebasPath = '/home/farmaciasyg/public_html/sistema/pruebas';

const pruebasPath = '//salazar-server/sistema/pruebas';
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, pruebasPath); // guardar directamente en esa carpeta
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);           // .pdf / .xml
        const base = path.basename(file.originalname, ext);    // nombre sin extensión
        const safeBase = base.replace(/\s+/g, '_');            // sin espacios
        const filename = `${Date.now()}_${safeBase}${ext}`;    // nombre final
        cb(null, filename);
    }
});

export const uploadFactura = multer({ storage });

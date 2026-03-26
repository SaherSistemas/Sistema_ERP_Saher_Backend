import fs from 'fs';
import path from 'path';

// ── helper para guardar la firma ──────────────────────────────────────────────
export const guardarFirma = (base64: string, id: string): string => {
    const data = base64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(data, 'base64');

    // Carpeta firmas junto al router
    const carpeta = path.join(__dirname, '../firmasLOCAL');

    console.log('📁 Guardando firma en:', carpeta); // ← verifica la ruta

    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });

    const nombreArchivo = `firma_${id}_${Date.now()}.png`;
    fs.writeFileSync(path.join(carpeta, nombreArchivo), buffer);

    return `/uploads/firmas/${nombreArchivo}`;
};
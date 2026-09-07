// Script de prueba: npx ts-node test-cfdi-pdf.ts
import fs from 'fs';
import path from 'path';
import { parseCfdiXml, generarPdfDesdeCfdi } from './src/modules/Facturas/helpers/cfdi-xml-to-pdf.helper';

const xmlPath = process.argv[2];
if (!xmlPath) {
    console.error('Uso: npx ts-node test-cfdi-pdf.ts <ruta-al-xml>');
    process.exit(1);
}

const xmlContent = fs.readFileSync(xmlPath, 'utf-8');
const cfdi = parseCfdiXml(xmlContent);

console.log('UUID:', cfdi.uuid);
console.log('Folio:', cfdi.serie + cfdi.folio);
console.log('Emisor:', cfdi.emisor.nombre);
console.log('Receptor:', cfdi.receptor.nombre);
console.log('Total:', cfdi.total);
console.log('Conceptos:', cfdi.conceptos.length);

const outPath = path.join(process.cwd(), `TEST_${cfdi.serie}${cfdi.folio}.pdf`);

generarPdfDesdeCfdi(cfdi, outPath).then(() => {
    console.log('\nPDF generado:', outPath);
}).catch(err => {
    console.error('Error:', err.message);
});

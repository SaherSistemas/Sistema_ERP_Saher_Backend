import fs from 'fs';
import { generarReciboPDFBuffer } from './src/modules/Finanzas/Cuentas_Por_Cobrar/helpers/recibo_cobranza.pdf';

// Recibo de muestra con datos de ejemplo (borrar este archivo cuando ya no se necesite)
(async () => {
    const buf = await generarReciboPDFBuffer({
        numero_recibo: 'LE_12451',
        fecha_emision: '2026-10-16',
        razon_social: 'ABARROTES Y MISCELANEA RAFAELA S.A. DE C.V.',
        nombre_cliente: 'Abarrote Rafaela',
        ciudad: 'Culiacán, Sinaloa',
        notas: 'Pago de factura 38185 con nota de crédito de devolución',
        nombre_vendedor: 'Lizbeth Echevarria',
        abonos: [
            { folio_documento: '38185', valor_documento: 4872.5, id_forma_pago: '01', referencia_pago: null, banco: null, fecha_deposito: '2026-10-16', monto: 1500 },
            { folio_documento: '38186', valor_documento: 9231.0, id_forma_pago: '02', referencia_pago: '000417', banco: 'BBVA', fecha_deposito: '2026-10-16', monto: 3200.75 },
            { folio_documento: '38190', valor_documento: 1204.2, id_forma_pago: '03', referencia_pago: 'SPEI 88231', banco: 'SANTANDER', fecha_deposito: '2026-10-15', monto: 1204.2 },
        ],
    });
    fs.writeFileSync(process.argv[2] ?? 'muestra_recibo.pdf', buf);
    console.log('listo', buf.length);
})();

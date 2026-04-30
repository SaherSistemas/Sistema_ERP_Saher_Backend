import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { Transaction } from "sequelize";
import { ICreateCompra_Proveedor, IEsctructuraCompra } from "../interface/Compra_Proveedor.interface";
import { ArticuloRepository } from '../../../Catalogos/Articulos/repositories/Articulo.repository';
import { Compra_ProveedorRepository } from "../repositories/Compra_Proveedor.repository";
import { Detalle_Compra_SolicitadoRepository } from "../repositories/Detalle_Compra_Solicitado.repository";
import { Listado_ProveedorRepository } from "../../Proveedores/repositories/Listado_Proveedor.repository";
import { ProveedorRepository } from '../../Proveedores/repositories/Proveedor.repository';
import { ICreateCompra_General } from '../interface/Compra_General.interface';
import { ICreateOAcumularDetallesSolicitados } from '../interface/Detalle_Compra_Solicitado.interface';
import { CompraGeneralRepository } from '../repositories/Compra_General.repository';
import { mapCompraProveedor } from '../mappers/compraProveedor.mapper';
import id from 'zod/v4/locales/id.js';
import { dbLocal } from '../../../../config/db';
import Factura_Compra_Proveedor from '../../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor';
import { Factura_Compra_ProveedorRepository } from '../../../Finanzas/Cuentas_Por_Pagar/repositories/Factura_Compra_Proveedor.repository';

export const compraProveedorService = {
    getCompraProveedorPorIdGeneral: async (id_compra_general: string) => {
        const rows = await Compra_ProveedorRepository.getAllCompra_ProveedorPorIdCompGener(id_compra_general)
        //console.log
        const plain = rows.map((r: any) => typeof r.get === 'function' ? r.get({ plain: true }) : r);
        return plain.map(mapCompraProveedor)
    },
    getComprasPendientes: async () => {
        const rows = await Factura_Compra_ProveedorRepository.getFacturasPendientes();
        const plain = rows.map((r: any) => typeof r.get === 'function' ? r.get({ plain: true }) : r);
        return plain.map(mapCompraProveedor);
    },
    createCompraProveedor: async (data: IEsctructuraCompra) => {
        const { id_empresa, id_listproveedor, detalle, tipo_compra } = data

        const listado = await Listado_ProveedorRepository.getByID(id_listproveedor)
        const id_proveedor = listado.id_prove_listprove;

        //BUSCAR ARTICULO
        const articulo = await ArticuloRepository.getByIDFlexible(detalle.idarticulo_detcompsol)
        const uuidArticulo = articulo.id_artic;

        //BUSCAR O CREAR COMPRA GENERAL EN EL ESTAOD "C"
        let compraGeneralActiva = await CompraGeneralRepository.getCompraEnCaptura(id_empresa);
        let compraProveedor = await Compra_ProveedorRepository.findCompraProveedor_CapturandoByProveedor(id_proveedor, id_empresa)

        //CRAR COMPRA GENERAL
        const dataCrearCompraGeneral: ICreateCompra_General = {
            tipo_compra: tipo_compra,
            fecha_inicio: new Date(),
            id_empre: id_empresa,
            estado_comp: 'C',
            ultimo_articulo_guardado: uuidArticulo
        }
        if (!compraGeneralActiva) {
            compraGeneralActiva = await CompraGeneralRepository.createCompra_General(dataCrearCompraGeneral)
        } else {
            await CompraGeneralRepository.actualizarArticuloGuardadoUltimo(compraGeneralActiva.id_compra_general, uuidArticulo)
        }

        //CREAR COMPRA PROVEEDOR
        const dataCreateCompraProveedor: ICreateCompra_Proveedor = {
            idprove_comp: id_proveedor,
            id_compra_general: compraGeneralActiva.id_compra_general
        }
        if (!compraProveedor) {
            compraProveedor = await Compra_ProveedorRepository.createCompraProveedor(dataCreateCompraProveedor)
        }

        //Agregar o Acumular el detalle
        // * DATA PARA GUARDAR
        const dataAcumularOAgregarDetalles: ICreateOAcumularDetallesSolicitados = {
            id_compra: compraProveedor.id_comp,
            detalles: [
                {
                    idarticulo_detcompsol: uuidArticulo,
                    cantidad_detcompsol: detalle.cantidad_detcompsol,
                    precio_detcompsol: detalle.precio_detcompsol,
                }
            ],
            reemplazar: data.reemplazar
        }
        const Detalles = await Detalle_Compra_SolicitadoRepository.addDetallesCompraSolicitado(dataAcumularOAgregarDetalles);

        return {
            compra_general: compraGeneralActiva,
            compra_proveedor: compraProveedor,
            detalle_agregado: Detalles
        }

    },

    generarPDFListado: async (id_comp: string): Promise<Buffer> => {
        const compraProveedor = await Compra_ProveedorRepository.articulosDetalleCompraProveedor(id_comp);
        const { proveedor, detallesCompra } = compraProveedor;

        const doc = new PDFDocument({ margin: 30, size: 'letter' });
        const buffers: Buffer[] = [];
        doc.on('data', buffers.push.bind(buffers));

        const TL = 30, TR = 540, TW = 510;
        const C = {
            codigo: { x: 32, w: 84 },
            desc: { x: 119, w: 142 },
            cant: { x: 264, w: 34 },
            precio: { x: 301, w: 60 },
            pctIva: { x: 364, w: 32 },
            iva: { x: 399, w: 60 },
            importe: { x: 462, w: 75 },
        };

        const drawTableHeader = (y: number): number => {
            doc.rect(TL, y, TW, 18).fill('#1B4F72');
            doc.font('Helvetica-Bold').fontSize(8).fillColor('white');
            doc.text('Código', C.codigo.x, y + 5, { width: C.codigo.w, lineBreak: false });
            doc.text('Descripción', C.desc.x, y + 5, { width: C.desc.w, lineBreak: false });
            doc.text('Cant.', C.cant.x, y + 5, { width: C.cant.w, align: 'center', lineBreak: false });
            doc.text('P. Unit.', C.precio.x, y + 5, { width: C.precio.w, align: 'right', lineBreak: false });
            doc.text('%IVA', C.pctIva.x, y + 5, { width: C.pctIva.w, align: 'center', lineBreak: false });
            doc.text('IVA', C.iva.x, y + 5, { width: C.iva.w, align: 'right', lineBreak: false });
            doc.text('Importe', C.importe.x, y + 5, { width: C.importe.w, align: 'right', lineBreak: false });
            doc.font('Helvetica').fillColor('black');
            return y + 20;
        };

        // HEADER
        doc.rect(0, 0, 612, 65).fill('#1B4F72');
        doc.font('Helvetica-Bold').fontSize(22).fillColor('white').text('FARMACIA SAHER', 35, 14, { lineBreak: false });
        doc.font('Helvetica').fontSize(10).fillColor('#AED6F1').text('Orden de Compra a Proveedor', 35, 43, { lineBreak: false });
        doc.font('Helvetica').fontSize(9).fillColor('white');
        doc.text(`Folio: ${id_comp}`, 400, 26, { lineBreak: false });
        doc.text(`Fecha: ${dayjs().format('DD/MM/YYYY')}`, 400, 41, { lineBreak: false });

        // INFO PROVEEDOR
        let cy = 75;
        doc.rect(TL, cy, TW, 14).fill('#D6EAF8');
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#1B4F72').text('DATOS DEL PROVEEDOR', TL + 5, cy + 3, { lineBreak: false });
        cy += 16;

        doc.font('Helvetica').fontSize(9).fillColor('#1C2833');
        doc.text(`Nombre: ${proveedor.nomcort_prove}`, TL + 5, cy, { lineBreak: false });
        doc.text(`RFC: ${proveedor.rfc_prove}`, 310, cy, { lineBreak: false });
        cy += 13;
        doc.text(`Razón Social: ${proveedor.razsoc_prove}`, TL + 5, cy, { lineBreak: false });
        cy += 13;
        doc.text(`Correo: ${proveedor.corr_prove}`, TL + 5, cy, { lineBreak: false });
        doc.text(`Teléfono: ${proveedor.telef_prove}`, 310, cy, { lineBreak: false });
        cy += 14;

        doc.moveTo(TL, cy).lineTo(TR, cy).strokeColor('#AEB6BF').lineWidth(0.5).stroke();
        cy += 7;

        cy = drawTableHeader(cy);

        let subtotalSinIva = 0;
        const ivaGroups: Record<string, number> = {};
        let rowIndex = 0;

        for (const item of detallesCompra) {
            const cantidad = Number(item.cantidad_detcompsol);
            const precioUnit = Number(item.precio_detcompsol);
            const pctIva = Number(item.articulo?.tipo_iva?.porcentaje_iva ?? 0);
            const baseLine = cantidad * precioUnit;
            const ivaLinea = baseLine * pctIva;
            const importeTotal = baseLine + ivaLinea;

            subtotalSinIva += baseLine;
            const ivaKey = `${(pctIva * 100).toFixed(0)}%`;
            ivaGroups[ivaKey] = (ivaGroups[ivaKey] ?? 0) + ivaLinea;

            const descText = item.articulo?.des_artic ?? '';
            doc.font('Helvetica').fontSize(8);
            const rowH = Math.max(doc.heightOfString(descText, { width: C.desc.w }) + 6, 16);

            if (cy + rowH > doc.page.height - doc.page.margins.bottom - 10) {
                doc.addPage();
                cy = doc.page.margins.top;
                cy = drawTableHeader(cy);
                rowIndex = 0;
            }

            doc.rect(TL, cy, TW, rowH).fill(rowIndex % 2 === 0 ? '#FDFEFE' : '#EAF2FF');
            doc.font('Helvetica').fontSize(8).fillColor('#1C2833');

            doc.text(item.articulo?.cod_barr_artic ?? '', C.codigo.x, cy + 3, { width: C.codigo.w, lineBreak: false });
            doc.text(descText, C.desc.x, cy + 3, { width: C.desc.w });
            doc.text(`${cantidad}`, C.cant.x, cy + 3, { width: C.cant.w, align: 'center', lineBreak: false });
            doc.text(`$${precioUnit.toFixed(2)}`, C.precio.x, cy + 3, { width: C.precio.w, align: 'right', lineBreak: false });
            doc.text(`${(pctIva * 100).toFixed(0)}%`, C.pctIva.x, cy + 3, { width: C.pctIva.w, align: 'center', lineBreak: false });
            doc.text(`$${ivaLinea.toFixed(2)}`, C.iva.x, cy + 3, { width: C.iva.w, align: 'right', lineBreak: false });
            doc.text(`$${importeTotal.toFixed(2)}`, C.importe.x, cy + 3, { width: C.importe.w, align: 'right', lineBreak: false });

            doc.moveTo(TL, cy + rowH).lineTo(TR, cy + rowH).strokeColor('#D5D8DC').lineWidth(0.3).stroke();
            cy += rowH;
            rowIndex++;
        }

        // TOTALS
        const totalIva = Object.values(ivaGroups).reduce((a, b) => a + b, 0);
        const total = subtotalSinIva + totalIva;
        const ivaKeys = Object.keys(ivaGroups).sort();
        const boxNeeded = 22 + ivaKeys.length * 18 + 26;

        if (cy + boxNeeded > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
            cy = doc.page.margins.top;
        }

        cy += 10;
        const bx = 358, bw = 182;

        doc.rect(bx, cy, bw, 20).fill('#D6EAF8');
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1B4F72');
        doc.text('Subtotal (sin IVA):', bx + 5, cy + 6, { width: 112, lineBreak: false });
        doc.text(`$${subtotalSinIva.toFixed(2)}`, bx + 116, cy + 6, { width: 61, align: 'right', lineBreak: false });
        cy += 20;

        for (const key of ivaKeys) {
            doc.rect(bx, cy, bw, 18).fill('#FDFEFE');
            doc.font('Helvetica').fontSize(9).fillColor('#1C2833');
            doc.text(`IVA ${key}:`, bx + 5, cy + 5, { width: 112, lineBreak: false });
            doc.text(`$${ivaGroups[key].toFixed(2)}`, bx + 116, cy + 5, { width: 61, align: 'right', lineBreak: false });
            cy += 18;
        }

        doc.rect(bx, cy, bw, 24).fill('#1B4F72');
        doc.font('Helvetica-Bold').fontSize(11).fillColor('white');
        doc.text('TOTAL:', bx + 5, cy + 6, { width: 112, lineBreak: false });
        doc.text(`$${total.toFixed(2)}`, bx + 112, cy + 6, { width: 65, align: 'right', lineBreak: false });

        doc.end();
        return new Promise((resolve) => {
            doc.on('end', async () => {
                await Compra_ProveedorRepository.actualizarFechaEnviadaProveedor(id_comp);
                resolve(Buffer.concat(buffers));
            });
        });
    },

    obtenerNombreArchivoPDF: async (id_comp: string): Promise<string> => {
        const compra = await Compra_ProveedorRepository.getByID(id_comp);
        if (!compra) {
            throw new Error('Compra no encontrada');
        }

        const proveedore = await ProveedorRepository.findByPKNOMBRE(compra.idprove_comp);

        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();

        const fechaFormateada = `${dia}-${mes}-${anio}`;


        const proveedor = proveedore.nomcort_prove || 'Proveedor';
        return `${proveedor}_${fechaFormateada}.pdf`;
    },


    getAllCompras_ProveedorParaRecibir: async (id_empresa_sucursal: string) => {
        return await Compra_ProveedorRepository.getAllCompras_ProveedorParaRecibir(id_empresa_sucursal)
    },

    marcarCompraProveedorComoRecibida: async (id_comp: string, id_empleado: string) => {
        return await Compra_ProveedorRepository.marcarCompraProveedorComoRecibida(id_comp, id_empleado);
    },

    marcarIniciarChecado: async (id_comp: string, id_empleado: string) => {
        return await Compra_ProveedorRepository.iniciarChequeoDeCompraProveedor(id_comp, id_empleado)
    },

    marcarInicioAcomodo: async (id_comp: string, id_empleado: string) => {
        return await Compra_ProveedorRepository.iniciarAcomodoDeCompraProveedor(id_comp, id_empleado)
    },
    marcarFinAcomodo: async (id_comp: string, id_empleado: string) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        // ! TAMBIEN TENEMOS QUE SUMAR LO QUE SE CHECO AL TOTAL DE LA COMPRA GENERAL
        //MARCAR FIN ACOMODO DE LA COMPRA PROVEEDOR
        await Compra_ProveedorRepository.finalizarAcomodoDeCompraProveedor(id_comp, id_empleado, { transaction: t })
        //FINALIZAR COMPRA GENERAL SI YA NO HAY MAS COMPRAS EN ESTATUS DIFERENTE A F
        const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp, t);

        //NUMERO DE PENDIENTES
        const pendientes = await Compra_ProveedorRepository.comprasProveedorSinTerminar(compraProveedor.id_compra_general, { transaction: t })
        if (pendientes.pendientes === 0) {
            await CompraGeneralRepository.finalizarCompraGeneralSiEsNecesario(compraProveedor.id_compra_general, pendientes.pendientes, { transaction: t });
        }
        await t.commit();
        return {
            pendientes: pendientes.pendientes,
        };
    },

}

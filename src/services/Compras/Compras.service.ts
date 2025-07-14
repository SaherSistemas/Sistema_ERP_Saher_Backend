import { IEsctructuraCompra } from "../../interface/Compras/Compra_Proveedor.interface";
import { ArticuloRepository } from "../../repository/Articulos/Articulo.repository";
import { CompraRepository } from "../../repository/Compras/Compra.repository";
import { Listado_ProveedorRepository } from "../../repository/Proveedor/Listado_Proveedor.repository";
import PDFDocument from 'pdfkit';
import dayjs from 'dayjs';
import { Detalle_Compra_SolicitadoRepository } from "../../repository/Compras/Detalle_Compra_Solicitado.repository";
import { Compra_ProveedorRepository } from "../../repository/Compras/Compra_Proveedor.repository";
import { ProveedorRepository } from "../../repository/Proveedor/Proveedor.repository";


export const CompraService = {
    getAll: async (id_empresa: string, page: number, limit: number) => {
        return await CompraRepository.getAllCompra_General(id_empresa, page, limit);
    },
   
    getEnCaptura: async (id_empresa: string) => {
        return await CompraRepository.getCompraEnCaptura(id_empresa)
    },
    createCompra: async (data: IEsctructuraCompra) => {
        const { id_empresa, id_listproveedor, detalle, tipo_compra } = data

        const listado = await Listado_ProveedorRepository.getByID(id_listproveedor)
        const id_proveedor = listado.id_prove_listprove;

        //BUSCAR O CREAR COMPRA GENERAL EN EL ESTAOD "C"
        const articulo = await ArticuloRepository.getByIDFlexible(detalle.id_articulo_detcompsol)
        const uuidArticulo = articulo.id_artic;

        let compraGeneralActiva = await CompraRepository.getCompraEnCaptura(id_empresa);
        let compraProveedor = await Compra_ProveedorRepository.findCompraProveedor_CapturandoByProveedor(id_proveedor, id_empresa)


        if (!compraGeneralActiva) {
            compraGeneralActiva = await CompraRepository.createCompra_General({
                tipo_compra: tipo_compra,
                fecha_inicio: new Date(),
                id_empre: id_empresa,
                estado_comp: 'C',
                ultimo_articulo_guardado: uuidArticulo
            })
        } else {
            await CompraRepository.actualizarArticuloGuardadoUltimo(compraGeneralActiva.id_compra_general, uuidArticulo)
        }


        if (!compraProveedor) {
            compraProveedor = await Compra_ProveedorRepository.createCompraProveedor({
                idprove_comp: id_proveedor,
                id_compra_general: compraGeneralActiva.id_compra_general
            })
        }

        //Agregar o Acumular el detalle
        const Detalles = await Detalle_Compra_SolicitadoRepository.addDetallesCompraSolicitado(
            compraProveedor.id_comp,
            [
                {
                    idarticulo_detcompsol: uuidArticulo,
                    cantidad_detcompsol: detalle.cantidad_detcompsol,
                    precio_detcompsol: detalle.precio_detcompsol,
                }
            ]
        );

        return {
            compra_general: compraGeneralActiva,
            compra_proveedor: compraProveedor,
            detalle_agregado: Detalles
        }

    },

    finalizarCompras: async (id_empresa_sucursal: string) => {
        return await CompraRepository.actualizarEstadoCompras(id_empresa_sucursal)
    },


    getCompraProveedorPorIdGeneral: async (id_compra_general: string) => {
        return await Compra_ProveedorRepository.getAllCompra_ProveedorPorIdCompGener(id_compra_general)
    },

    articulosDetalleCompraProveedor: async (id_comp: string) => {
        return await Compra_ProveedorRepository.articulosDetalleCompraProveedor(id_comp);
    },

    generarPDFListado: async (id_comp: string): Promise<Buffer> => {
        const compraProveedor = await CompraService.articulosDetalleCompraProveedor(id_comp);
        const { proveedor, detallesCompra } = compraProveedor;

        const doc = new PDFDocument({ margin: 30, size: 'letter' });
        const buffers: Buffer[] = [];

        doc.on('data', buffers.push.bind(buffers));

        const drawEncabezadoTabla = () => {
            const y = doc.y;
            doc.rect(30, y, 550, 20).fill('#E0E0E0');
            doc.fillColor('black').font('Helvetica-Bold').fontSize(10);
            doc.text('Código', 32, y + 5);
            doc.text('Descripción', 130, y + 5);
            doc.text('Cantidad', 300, y + 5);
            doc.text('Precio', 380, y + 5);
            doc.text('Importe', 460, y + 5);
            doc.moveDown(1.5);
            doc.font('Helvetica');
        };

        // 🟦 ENCABEZADO
        doc.rect(0, 0, 612, 60).fill('#3C8DBC');
        doc.fillColor('white').fontSize(20).text('FARMACIA SAHER', 40, 20);
        doc.fillColor('black');
        doc.moveDown(2);
        doc.fontSize(14).text('Orden de Compra a Proveedor', { underline: true });
        doc.moveDown();
        doc.fontSize(11);
        doc.text(`Proveedor: ${proveedor.nomcort_prove}`);
        doc.text(`Razón Social: ${proveedor.razsoc_prove}`);
        doc.text(`RFC: ${proveedor.rfc_prove}`);
        doc.text(`Correo: ${proveedor.corr_prove}`);
        doc.text(`Teléfono: ${proveedor.telef_prove}`);
        doc.text(`Fecha: ${dayjs().format('DD/MM/YYYY')}`);
        doc.moveDown().moveTo(30, doc.y).lineTo(580, doc.y).strokeColor('#CCCCCC').stroke();
        doc.moveDown();

        drawEncabezadoTabla();

        let subtotal = 0;

        for (const item of detallesCompra) {
            const cantidad = Number(item.cantidad_detcompsol);
            const precio = Number(item.precio_detcompsol);
            const importe = cantidad * precio;
            subtotal += importe;

            const articulo = item.articulo;

            const espacioNecesario = 40;
            if (doc.y + espacioNecesario > doc.page.height - doc.page.margins.bottom) {
                doc.addPage();
                drawEncabezadoTabla();
            }

            const startY = doc.y;
            doc.text(articulo.cod_barr_artic, 30, startY);
            doc.text(articulo.des_artic, 130, startY, { width: 160, lineGap: 1 });

            const yFinal = doc.y;
            doc.text(`${cantidad}`, 300, startY);
            doc.text(`$${precio.toFixed(2)}`, 380, startY);
            doc.text(`$${importe.toFixed(2)}`, 460, startY);

            doc.y = Math.max(yFinal, startY) + 5;
        }

        const iva = subtotal * 0.16;
        const total = subtotal + iva;

        if (doc.y + 60 > doc.page.height - doc.page.margins.bottom) {
            doc.addPage();
        }

        doc.moveDown(1);
        const totalBoxY = doc.y;
        doc.rect(400, totalBoxY, 170, 45).fill('#F5F5F5');
        doc.fillColor('black').fontSize(11);
        doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 410, totalBoxY + 5);

        doc.end();
        return new Promise((resolve) => {
            doc.on('end', async () => {
                // ✅ ACTUALIZA LA FECHA SI ES NULL
                await Compra_ProveedorRepository.actualizarFechaEnviadaProveedor(id_comp)

                const pdfBuffer = Buffer.concat(buffers);
                resolve(pdfBuffer);
            });
        });
    },
    obtenerNombreArchivoPDF: async (id_comp: string): Promise<string> => {
        const compra = await Compra_ProveedorRepository.getByID(id_comp);
        if (!compra) {
            throw new Error('Compra no encontrada');
        }

        const proveedore = await ProveedorRepository.findByPK(compra.idprove_comp);

        const hoy = new Date();
        const dia = String(hoy.getDate()).padStart(2, '0');
        const mes = String(hoy.getMonth() + 1).padStart(2, '0');
        const anio = hoy.getFullYear();

        const fechaFormateada = `${dia}-${mes}-${anio}`;


        const proveedor = proveedore.nomcort_prove || 'Proveedor';
        return `${proveedor}_${fechaFormateada}.pdf`;
    }




}
import { ICrearLotesFacturaRepoDTO } from "../interface/Lote_Factura_Compra_Proveedor.interface";
import Lote_Factura_Compra_Proveedor from "../model/Lote_Factura_Compra_Proveedor";
import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import { IModificarLotesDetalleFacturaDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";

export const Lote_Factura_Compra_ProveedorRepository = {

    updateLoteFacturaCompraProveedor: async (
        data: IModificarLotesDetalleFacturaDTO,
        t?: Transaction
    ) => {
        const { id_factura_proveedor_detalle, lotes } = data;

        const SUFIJO = "(FISICAMENTE VIENE ESTE LOTE)";

        for (const l of lotes || []) {
            const id = l.id_lote_factura_compra_proveedor ?? null;

            const observBase = (l.observacion_lote ?? "").trim();
            const observCreate =
                observBase.length === 0
                    ? SUFIJO
                    : observBase.includes(SUFIJO)
                        ? observBase
                        : `${observBase} ${SUFIJO}`;

            // --- Si trae ID, intenta update; si no existe => create
            if (id) {
                const [affected] = await Lote_Factura_Compra_Proveedor.update(
                    {
                        numero_lote: (l.numero_lote ?? "").trim(),
                        fecha_caducidad: l.fecha_caducidad || null,
                        cantidad_lote: Number(l.cantidad_lote) || 0,
                        observacion_lote: observBase, // UPDATE: tal cual venga (sin sufijo)
                        // si tu tabla tiene FK al detalle:
                        id_factura_proveedor_detalle,
                    },
                    {
                        where: { id_lote_factura_compra_proveedor: id },
                        transaction: t,
                    }
                );

                // si no actualizó nadie, es porque no existe => CREATE con sufijo
                if (affected === 0) {
                    await Lote_Factura_Compra_Proveedor.create(
                        {
                            id_lote_factura_compra_proveedor: id, // si quieres respetar el id que viene
                            id_factura_proveedor_detalle,
                            numero_lote: (l.numero_lote ?? "").trim(),
                            fecha_caducidad: l.fecha_caducidad || null,
                            cantidad_lote: Number(l.cantidad_lote) || 0,
                            observacion_lote: observCreate,
                        },
                        { transaction: t }
                    );
                }

                continue;
            }

            // --- No trae ID => CREATE con sufijo
            await Lote_Factura_Compra_Proveedor.create(
                {
                    id_factura_proveedor_detalle,
                    numero_lote: (l.numero_lote ?? "").trim(),
                    fecha_caducidad: l.fecha_caducidad || null,
                    cantidad_lote: Number(l.cantidad_lote) || 0,
                    observacion_lote: observCreate,
                },
                { transaction: t }
            );
        }

        return { ok: true, total: (lotes || []).length };
    },
    createMultiple: async (payload: ICrearLotesFacturaRepoDTO, t?: Transaction) => {
        const rows = payload.lotes.map(l => ({
            id_lote_factura_compra_proveedor: uuidv4(),
            id_det_factura_proveedor: l.id_det_factura_proveedor,
            numero_lote: l.numero_lote,
            precio_articulo_factura: l.precio_articulo_factura,
            fecha_caducidad: l.fecha_caducidad,
            cantidad_lote: l.cantidad_lote,
            observacion_lote: l.observacion_lote ?? null
        }));

        return await Lote_Factura_Compra_Proveedor.bulkCreate(rows, {
            transaction: t
        });
    }
};
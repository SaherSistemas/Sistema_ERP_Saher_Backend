import { v4 as uuidv4 } from 'uuid';
import { Transaction } from 'sequelize';
import Detalle_Factura_Compra_Proveedor from '../model/Detalle_Factura_Compra_Proveedor';
import {
    ICrearDetallesFacturaRepoDTO
} from '../interface/Detalle_Factura_Compra_Proveedor.interface';
import Lote_Factura_Compra_Proveedor from '../model/Lote_Factura_Compra_Proveedor';
import Detalle_Compra_Solicitado from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Solicitado';

import { UsuarioRepository } from '../../../Seguridad/repositories/Usuario.repository';
import Detalle_Compra_Recibido from '../../../Compras/Ordenes-Compra/model/Detalle_Compra_Recibido';
import LotesRecibidosCompra from '../../../../models/LotesYCaducidad/LotesRecibidosCompra';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';

export const Detalle_Factura_Compra_ProveedorRepository = {
    getByPK: async (id_factura_proveedor_detalle: string) => {
        return await Detalle_Factura_Compra_Proveedor.findByPk(id_factura_proveedor_detalle);
    },
    createMultiple: async (payload: ICrearDetallesFacturaRepoDTO, t: Transaction) => {
        const rows = payload.detalles.map(d => ({
            id_factura_proveedor_detalle: uuidv4(),
            id_factura_compra_proveedor: payload.id_factura_compra_proveedor,
            ...d
        }));

        const created = await Detalle_Factura_Compra_Proveedor.bulkCreate(rows, {
            transaction: t,
            returning: true
        });

        return created.map((r: any) => ({
            id_factura_proveedor_detalle: r.id_factura_proveedor_detalle,
            id_detcompsol: r.id_detcompsol
        }));
    },
    getCountProductosPorFactura: async (id_factura_compra_proveedor: string) => {
        const results = await Detalle_Factura_Compra_Proveedor.count({
            where: { id_factura_compra_proveedor },
        });
        return results;
    },
    marcarDetalleFacturaCompraProveedorComoRecibido: async (id_factura_proveedor_detalle: string, t: Transaction) => {
        const [affectedRows, [detalle]] = await Detalle_Factura_Compra_Proveedor.update(
            {
                checado: true,
                fecha_checado: new Date(),
            },
            {
                where: { id_factura_proveedor_detalle },
                returning: true,
            }
        );
        return detalle;
    },
    getDetallesPorIdFacturaProveedor: async (id_factura_proveedor: string) => {
        return await Detalle_Factura_Compra_Proveedor.findAll({
            where: { id_factura_compra_proveedor: id_factura_proveedor },
            attributes: [
                'id_factura_proveedor_detalle',
                'id_factura_compra_proveedor',
                'precio_articulo_factura',
                'iva_articulo_factura',
                'cantidad_articulo_facturada',
                'checado',
                'fecha_checado'
            ],
            include: [
                // 1) Lotes “de factura” (lo esperado/capturado)
                {
                    model: Lote_Factura_Compra_Proveedor,
                    attributes: [
                        'id_lote_factura_compra_proveedor',
                        'numero_lote',
                        'fecha_caducidad',
                        'cantidad_lote',
                        'observacion_lote'
                    ],
                    required: false
                },

                // 2) Lotes “recibidos” (lo real checado)
                {
                    model: Detalle_Compra_Recibido,
                    attributes: ['id_detcomprec', 'cantidad_detcomprec'],
                    required: false,
                    include: [
                        {
                            model: LotesRecibidosCompra,
                            attributes: [
                                'id_loterecibido',
                                'numerolote_lote',
                                'fechavencimiento_lote',
                                'cantidad_lote',
                                'observacion_lote'
                            ],
                            required: false
                        }
                    ]
                },

                // 3) Artículo
                {
                    model: Detalle_Compra_Solicitado,
                    attributes: ['id_detcompsol', 'idarticulo_detcompsol'],
                    include: [
                        {
                            model: Articulo,
                            attributes: ['id_artic', 'cod_barr_artic', 'des_artic']
                        }
                    ]
                }
            ],
        });

    },
};

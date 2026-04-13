import { v4 as uuidv4 } from 'uuid';
import { Op, QueryTypes, Transaction } from 'sequelize';
import Pedido_Almacen_Empaque from '../model/Pedido_Almacen_Empaque';
import { Bulto_Pedido } from '../model/Bulto_Pedido';
import { ICrearBultoPayload } from '../interface/Bulto_Pedido.interface';
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen';
import { dbLocal } from '../../../../config/db';

export interface InfoBultoImpresion {
    cod_bulto: string;
    num_bulto: number;
    total_bulto: number;
    cod_int_pedido_alm: string;
    fecha_facturado: string | null;
    razon_social_cliente: string;
    nom_corto_cliente: string;
    empacador: string;
    agente: string | null;
    surtidores: string | null;
    checadores: string | null;
}

export const Bulto_PedidoRepository = {


    bulkCrearBultos: async (payloads: ICrearBultoPayload[], t?: Transaction) => {
        if (!payloads.length) return [];

        return await Bulto_Pedido.bulkCreate(
            payloads.map((item) => ({
                id_pedido_empaque: item.id_pedido_empaque,
                cod_bulto: item.cod_bulto,
                tipo_bulto: item.tipo_bulto,
                num_bulto: item.num_bulto,
                total_bulto: item.total_bulto,
                escaneado: item.escaneado ?? false
            })),
            { transaction: t }
        );
    },



    getInfoPedidoParaBulto: async (cod_bulto: string): Promise<InfoBultoImpresion> => {
        const rows = await dbLocal.query<InfoBultoImpresion>(`
            SELECT
                bp.cod_bulto,
                bp.num_bulto,
                bp.total_bulto,
                pa.cod_int_pedido_alm,
                TO_CHAR(pa.fecha_facturado_pedido_alm, 'DD/MM/YY  HH24:MI:SS') AS fecha_facturado,
                ca.razon_social_cliente_alm                                      AS razon_social_cliente,
                ca.nom_corto_cliente_alm                                         AS nom_corto_cliente,
                CONCAT(e_emp.nombre_empleado, ' ', e_emp.ap_pat_empleado)        AS empacador,
                CONCAT(e_ag.nombre_empleado,  ' ', e_ag.ap_pat_empleado)         AS agente,
                (
                    SELECT STRING_AGG(DISTINCT CONCAT(e_s.nombre_empleado, ' ', e_s.ap_pat_empleado), ', ')
                    FROM detalle_pedido_almacen        dpa
                    JOIN detalle_pedido_almacen_asignacion dpaa
                        ON dpaa.id_detalle_pedido_almacen = dpa.id_detalle_pedido_almacen
                    JOIN empleado e_s ON e_s.id_empleado = dpaa.id_usuario
                    WHERE dpa.id_pedido_almacen = pae.id_pedido_almacen
                ) AS surtidores,
                (
                    SELECT STRING_AGG(DISTINCT CONCAT(e_c.nombre_empleado, ' ', e_c.ap_pat_empleado), ', ')
                    FROM detalle_pedido_almacen        dpa2
                    JOIN detalle_pedido_almacen_chequeo dpac
                        ON dpac.id_detalle_pedido_almacen = dpa2.id_detalle_pedido_almacen
                    JOIN empleado e_c ON e_c.id_empleado = dpac.id_empleado
                    WHERE dpa2.id_pedido_almacen = pae.id_pedido_almacen
                ) AS checadores
            FROM bulto_pedido            bp
            JOIN pedido_almacen_empaque  pae ON pae.id_pedido_empaque   = bp.id_pedido_empaque
            JOIN pedido_almacen          pa  ON pa.id_pedido_alm        = pae.id_pedido_almacen
            JOIN cliente_almacen         ca  ON ca.id_cliente_alm       = pa.id_cliente_pedido_alm
            JOIN empleado                e_emp ON e_emp.id_empleado     = pae.id_empleado_empaco
            LEFT JOIN agente_de_venta    av  ON av.id_agente            = pa.id_agente_pedido_alm
            LEFT JOIN empleado           e_ag ON e_ag.id_empleado       = av.id_empleado
            WHERE bp.cod_bulto = :cod_bulto
            LIMIT 1
        `, {
            replacements: { cod_bulto },
            type: QueryTypes.SELECT,
        });

        if (!rows.length) throw new Error('Bulto no encontrado');
        return rows[0];
    }
};
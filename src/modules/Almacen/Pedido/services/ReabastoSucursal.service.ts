import { Op } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import ClienteAlmacen from '../../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import Agente_de_Venta from '../../../Comercial/Agente_Venta/model/Agente_De_Venta';
import DetalleListaPrecio from '../../../Comercial/Precios/model/Detalle_Lista_Precio';
import Pedido_Almacen from '../model/Pedido_Almacen';
import { Pedido_AlmacenRepository } from '../repositories/Pedido_Almacen.repository';
import { Detalle_Pedido_AlmacenRepository } from '../repositories/Detalle_Pedido_Almacen.repository';
import { CalculoNecesariosService } from './CalculoNecesarios.service';

// ─────────────────────────────────────────────────────────────────────────────
// PEDIDO DE REABASTO
//   Crea un pedido NUEVO, en captura (para revisarlo), con lo que una sucursal debería pedir según el cálculo de reabasto:
//   todo lo que vende con regularidad, menos lo que tiene, lo que va en camino y lo que ya está en cualquiera de sus pedidos.
//   No parte de ningún pedido que hayan hecho. Cada renglón se limita a lo disponible en el almacén ("Nuevo solicitado").
//   El cálculo se repite en el servidor con los mismos parámetros: no se confía en cantidades que mande la pantalla.
// ─────────────────────────────────────────────────────────────────────────────

export const ReabastoSucursalService = {

    crear: async (id_empresa: string, opts: { id_cliente_alm: string; dia_envio?: number; nivel_servicio?: number }) => {
        const calculo = await CalculoNecesariosService.reabasto(id_empresa, {
            ids_clientes: [opts.id_cliente_alm], dia_envio: opts.dia_envio, nivel_servicio: opts.nivel_servicio,
        });
        const suc = calculo.sucursales[0];
        if (!suc) throw { status: 404, message: 'Sucursal no encontrada o sin existencia en PolyDB.' };

        const lineas = (suc.lineas as any[]).filter(l => l.id_articulo && Number(l.nuevo_solicitado) > 0);
        if (!lineas.length) throw { status: 400, message: 'No hay nada que reabastecer: la sucursal ya tiene cubierto lo necesario o el almacén no tiene lo que falta.' };

        const cliente = await ClienteAlmacen.findByPk(opts.id_cliente_alm, {
            attributes: ['id_cliente_alm', 'id_agente_cliente_alm', 'id_lista_precio_cliente_alm'],
        }) as any;
        if (!cliente) throw { status: 404, message: 'Cliente no encontrado.' };
        if (!cliente.id_agente_cliente_alm) throw { status: 400, message: 'La sucursal no tiene agente asignado.' };
        if (!cliente.id_lista_precio_cliente_alm) throw { status: 400, message: 'La sucursal no tiene lista de precios asignada.' };

        // Un cliente solo tiene un pedido en captura a la vez
        const enCaptura = await Pedido_Almacen.findOne({
            where: { id_cliente_pedido_alm: opts.id_cliente_alm, status_pedido_alm: 'EC' },
            attributes: ['cod_int_pedido_alm'],
        }) as any;
        if (enCaptura) {
            throw { status: 409, message: `Esta sucursal ya tiene un pedido en captura (${enCaptura.cod_int_pedido_alm}). Termínalo o cámbialo antes de crear el de reabasto.` };
        }

        // Precios: lista de precios del cliente. Lo que no tenga precio no se puede pedir y se avisa
        const precios = await DetalleListaPrecio.findAll({
            where: { id_lista_precio: cliente.id_lista_precio_cliente_alm, id_artic: { [Op.in]: lineas.map(l => l.id_articulo as string) } },
            attributes: ['id_artic', 'precios'], raw: true,
        }) as any[];
        const precioDe = new Map<string, number>(precios.filter(x => Number(x.precios) >= 0.01).map(x => [x.id_artic as string, Number(x.precios)] as [string, number]));

        const items: { id_articulo: string; cantidad: number; precio: number }[] = [];
        const sin_precio: string[] = [];
        for (const l of lineas) {
            const precio = precioDe.get(l.id_articulo);
            if (precio === undefined) sin_precio.push(l.des_artic);
            else items.push({ id_articulo: l.id_articulo, cantidad: Number(l.nuevo_solicitado), precio });
        }
        if (!items.length) throw { status: 400, message: `Ningún artículo tiene precio en la lista de la sucursal: ${sin_precio.join(', ')}.` };

        const agente = await Agente_de_Venta.findByPk(cliente.id_agente_cliente_alm, { attributes: ['id_agente', 'cod_identi_agente'] }) as any;
        if (!agente) throw { status: 400, message: 'El agente de la sucursal no existe.' };
        const folio = await Pedido_AlmacenRepository.getFolioPedido(agente.cod_identi_agente);
        // La fecha de entrega se recalcula cuando el pedido pasa a capturado; aquí solo es la de arranque
        let fecha_max_entrega_alm = new Date();
        try { fecha_max_entrega_alm = await Pedido_AlmacenRepository.getFechaMaxEntrega(agente.id_agente); } catch { /* sin reglas: queda la fecha de hoy */ }

        const t = await dbLocal.transaction();
        try {
            const nuevo = await Pedido_AlmacenRepository.create({
                cod_int_pedido_alm: folio,
                status_pedido_alm: 'EC',
                tipo_pedido_alm: 'AUT',
                id_cliente_pedido_alm: opts.id_cliente_alm,
                id_agente_pedido_alm: agente.id_agente,
                fecha_max_entrega_alm,
            }, { transaction: t });
            await Detalle_Pedido_AlmacenRepository.bulkCreateDetalles(
                items.map(i => ({ id_pedido_almacen: nuevo.id_pedido_alm, id_articulo: i.id_articulo, cantidad: i.cantidad, precio_unitario: i.precio, es_oferta: false })),
                t,
            );
            await t.commit();
            return {
                id_pedido_alm: nuevo.id_pedido_alm,
                cod_int_pedido_alm: nuevo.cod_int_pedido_alm,
                renglones: items.length,
                piezas: items.reduce((s, i) => s + i.cantidad, 0),
                sin_precio,
            };
        } catch (err) {
            await t.rollback();
            throw err;
        }
    },
};

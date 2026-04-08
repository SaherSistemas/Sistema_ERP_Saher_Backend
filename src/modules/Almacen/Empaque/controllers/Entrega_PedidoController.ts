import type { Request, Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { Pedido_Almacen_EmpaqueService } from '../services/Pedido_Almacen_Empaque.service';
import { Entrega_PedidoService } from '../services/Entrega_Pedido.service';
import { Entrega_Pedido_FirmaRepository } from '../repositories/Entregar_Pedido_Firma.repository';
export class Entrega_PedidoController {

    static obtenerPedidosParaEntregaCliente = async (req: AuthedRequest, res: Response) => {
        try {
            const tipo = req.query.tipo as string;

            if (tipo !== 'ALMACEN' && tipo !== 'AGENTE') {
                res.status(400).json({ message: 'El parámetro tipo debe ser ALMACEN o AGENTE' });
                return;
            }

            const resultado = await Entrega_PedidoService.obtenerPedidosParaEntregaCliente({
                tipo,
                id_empresa: req.user?.id_empresa,
                id_persona: req.user?.id_referencia_persona,
            });
            // console.log(resultado)
            res.status(200).json(resultado);
        } catch (error: any) {
            console.log(error);
            const msg = error?.message ?? 'Error desconocido';
            res.status(500).json({ message: msg });
        }
    };

    static obtenerPedidosPorEntregar = async (req: AuthedRequest, res: Response) => {
        try {
            const resultado = await Entrega_PedidoService.obtenerPedidosPorEntregar(req.user?.id_empresa)
            console.log(resultado)
            res.status(200).json(resultado);
        } catch (error: any) {
            console.log(error)
            const msg = error?.message ?? 'Error desconocido';
            res.status(500).json({ message: msg });
        }
    };
    static crearSalida = async (req: Request, res: Response) => {
        try {
            const { firma_recibido, tipo_origen, tipo_destino, id_agente, id_cliente, bultos_escaneados, pedidos } = req.body;

            const resultado = await Entrega_PedidoService.crearSalida({
                tipo_destino,
                id_agente,
                id_cliente,
                bultos_escaneados,  // string[]  → cod_bulto[]
                pedidos,            // string[]  → cod_int_pedido_alm[]
                tipo_origen,
                firma_recibido
            });

            res.status(201).json(resultado);
        } catch (error: any) {
            console.log(error)
            const msg = error?.message ?? 'Error desconocido';
            res.status(500).json({ message: msg });
        }
    };

    static crearFirma = async (req: AuthedRequest, res: Response) => {
        try {
            const result = await Entrega_Pedido_FirmaRepository.agregarFirma(req.body);
            res.json(result);
        } catch (error) {
            res.status(500).json({ message: error.message });
        }
    };


}
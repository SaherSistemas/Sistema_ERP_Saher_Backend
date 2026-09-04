import type { Request, Response } from 'express';
import { AuthedRequest } from '../../../../middleware/auth';
import { Pedido_Almacen_EmpaqueService } from '../services/Pedido_Almacen_Empaque.service';
export class Pedido_Almacen_EmpaqueController {
  static obtenerPedidoEmpacando = async (_req: Request, res: Response) => {
    try {
      const resultado = await Pedido_Almacen_EmpaqueService.obtenerPedidoEmpacando();
      res.status(200).json(resultado);
    } catch (error: any) {
      const msg = error?.message ?? 'Error desconocido';
      res.status(500).json({ message: msg });
    }
  };




  static iniciarEmpaquePedido = async (req: AuthedRequest, res: Response) => {
    try {

      const { id_pedido_alm } = req.params;
      //console.log(id_pedido_alm)
      //console.log("HOLA DESDE BACKEND")
      const resultado = await Pedido_Almacen_EmpaqueService.iniciarEmpaquePedido(
        id_pedido_alm,
        req.user.id_referencia_persona
      );
      //  console.log(resultado)
      res.status(200).json(resultado);
    } catch (error: any) {
      console.log(error)
      const msg = error?.message ?? 'Error desconocido';

      if (msg.includes('no encontrado')) {
        res.status(404).json({ message: msg });
        return;
      }

      if (
        msg.includes('ya fue empacado') ||
        msg.includes('cancelado')
      ) {
        res.status(409).json({ message: msg });
        return;
      }

      res.status(500).json({ message: msg });
    }
  };

  static finalizarEmpaquePedido = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_empaque } = req.params;
      const { cajas, bolsas, nota, num_empleado } = req.body;
      const resultado = await Pedido_Almacen_EmpaqueService.finalizarEmpaquePedido(
        id_pedido_empaque,
        Number(cajas),
        Number(bolsas),
        nota,
        num_empleado ?? null
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      console.log(error)
      const msg = error?.message ?? 'Error desconocido';

      if (msg.includes('No existe')) {
        res.status(404).json({ message: msg });
        return;
      }

      if (
        msg.includes('no pueden ser negativas') ||
        msg.includes('al menos un bulto') ||
        msg.includes('Debes enviar cajas y bolsas')
      ) {
        res.status(422).json({ message: msg });
        return;
      }

      if (msg.includes('cancelado')) {
        res.status(409).json({ message: msg });
        return;
      }

      res.status(500).json({ message: msg });
    }
  };

  static actualizarBultosEmpaque = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_empaque } = req.params;
      const { cajas, bolsas, nota } = req.body;

      const resultado = await Pedido_Almacen_EmpaqueService.actualizarBultosEmpaque(
        id_pedido_empaque,
        {
          cajas: cajas !== undefined ? Number(cajas) : undefined,
          bolsas: bolsas !== undefined ? Number(bolsas) : undefined,
          nota
        }
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      const msg = error?.message ?? 'Error desconocido';

      if (
        msg.includes('No existe') ||
        msg.includes('no encontrado')
      ) {
        res.status(404).json({ message: msg });
        return;
      }

      if (
        msg.includes('no pueden ser negativas') ||
        msg.includes('al menos un bulto') ||
        msg.includes('Debes enviar al menos un campo')
      ) {
        res.status(422).json({ message: msg });
        return;
      }

      if (
        msg.includes('cancelado') ||
        msg.includes('Primero debes reabrirlo')
      ) {
        res.status(409).json({ message: msg });
        return;
      }

      res.status(500).json({ message: msg });
    }
  };

  static reabrirConBultos = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_empaque } = req.params;
      const { cajas, bolsas, nota, num_empleado } = req.body;

      if (cajas === undefined || bolsas === undefined) {
        res.status(400).json({ message: 'Debes enviar cajas y bolsas' });
        return;
      }

      const resultado = await Pedido_Almacen_EmpaqueService.reabrirConBultos(
        id_pedido_empaque,
        Number(cajas),
        Number(bolsas),
        nota ?? null,
        num_empleado ?? null
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      const msg = error?.message ?? 'Error desconocido';
      const status = msg.includes('No existe') || msg.includes('no encontrado') ? 404
        : msg.includes('cancelado') ? 409
        : msg.includes('al menos un bulto') ? 422
        : 500;
      res.status(status).json({ message: msg });
    }
  };

  static reabrirEmpaquePedido = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_pedido_empaque } = req.params;

      const resultado = await Pedido_Almacen_EmpaqueService.reabrirEmpaquePedido(
        id_pedido_empaque,
        req.user.id_referencia_persona
      );

      res.status(200).json(resultado);
    } catch (error: any) {
      const msg = error?.message ?? 'Error desconocido';

      if (
        msg.includes('No existe') ||
        msg.includes('no encontrado')
      ) {
        res.status(404).json({ message: msg });
        return;
      }

      if (msg.includes('cancelado')) {
        res.status(409).json({ message: msg });
        return;
      }

      res.status(500).json({ message: msg });
    }
  };
}
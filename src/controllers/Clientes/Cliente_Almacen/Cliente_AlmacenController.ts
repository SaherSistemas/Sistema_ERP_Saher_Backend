import type { Request, Response } from 'express';
import { QueryTypes } from 'sequelize';
import { dbLocal } from '../../../config/db';
import type { AuthedRequest } from '../../../middleware/auth';
import { Cliente_AlmacenService } from '../../../services/Clientes/Cliente_Almacen/cliente_Almacen.service';

export class Cliente_AlmacenController {
  // GET paginado
  static getAllPaginado = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const clientes = await Cliente_AlmacenService.getAllPaginado(page, limit);
      // console.log(clientes)
      res.status(200).json(clientes);
    } catch (error) {
      // console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener clientes.' });
    }
  };

  // GET por ID flexible
  static getByIDFlexible = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;
      const cliente = await Cliente_AlmacenService.getByIDFlexible(id_cliente_alm);
      res.status(200).json(cliente);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al obtener cliente.' });
    }
  };

  // GET por término de búsqueda
  static getClienteByTermSearch = async (req: Request, res: Response) => {
    try {
      const { term_search } = req.params;
      const clientes = await Cliente_AlmacenService.getClienteByTermSerch(term_search);
      //   console.log(clientes)
      res.status(200).json(clientes);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al buscar clientes.' });
    }
  };

  // GET por agente
  static getAllByUsuarioAgente = async (req: Request, res: Response) => {
    try {
      const { id_empleado } = req.params;
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 20;
      const nombre = req.query.nombre?.toString() || '';
      const estado = req.query.estado?.toString() || 'A';

      const data = await Cliente_AlmacenService.getAllByUsuarioAgente({
        id_empleado,
        page,
        limit,
        nombre,
        estado
      });

      res.status(200).json(data);
    } catch (error) {
      console.log(error);
      res.status(500).json({ mensaje: 'Error al obtener clientes del agente.' });
    }
  };

  // POST crear
  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevo = await Cliente_AlmacenService.create(data);
      res.status(201).json(nuevo);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al crear cliente.' });
    }
  };

  // PUT actualizar
  static update = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;
      const data = req.body;

      const actualizado = await Cliente_AlmacenService.update(id_cliente_alm, data);

      if (!actualizado) res.status(404).json({ mensaje: 'No existe el cliente.' });

      res.status(200).json(actualizado);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
    }
  };
  static ultimoID = async (req: Request, res: Response) => {
    try {
      const ultiomID = await Cliente_AlmacenService.getUltimoID();
      const siguienteID = ultiomID + 1;
      res.status(200).json(siguienteID);
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
    }
  };

  /**
   * PATCH /cliente_almacen/:id_cliente_alm/empresa-propia
   * Body: { id_empresa_sys_anterior: number | null, tipo_comprobante?: 'FAC' | 'TRA' }
   *
   * - null  → cliente externo normal (CFDI tipo I con CxC, sin insert en POS viejo)
   * - número + 'FAC' → empresa propia con CFDI timbrado + insert POS viejo
   * - número + 'TRA' → empresa propia con traslado interno sin timbre SAT
   */
  static toggleEmpresaPropia = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;
      const { id_empresa_sys_anterior, tipo_comprobante } = req.body as {
        id_empresa_sys_anterior: number | null;
        tipo_comprobante?: 'FAC' | 'TRA';
      };

      const esValido =
        id_empresa_sys_anterior === null ||
        (typeof id_empresa_sys_anterior === 'number' && Number.isInteger(id_empresa_sys_anterior) && id_empresa_sys_anterior > 0);

      if (!esValido) {
        res.status(400).json({ mensaje: 'id_empresa_sys_anterior debe ser null o un entero positivo.' });
        return;
      }

      if (tipo_comprobante && !['FAC', 'TRA'].includes(tipo_comprobante)) {
        res.status(400).json({ mensaje: 'tipo_comprobante debe ser FAC o TRA.' });
        return;
      }

      const updateData: any = { id_empresa_sys_anterior };
      if (tipo_comprobante) updateData.tipo_comprobante = tipo_comprobante;
      if (id_empresa_sys_anterior === null) updateData.tipo_comprobante = 'FAC'; // reset al quitar

      const updated = await Cliente_AlmacenService.update(id_cliente_alm, updateData);
      if (!updated) {
        res.status(404).json({ mensaje: 'Cliente no encontrado.' });
        return;
      }

      res.status(200).json({ ok: true, id_empresa_sys_anterior, tipo_comprobante: updateData.tipo_comprobante });
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al actualizar cliente.' });
    }
  };

  static toggleEstatus = async (req: Request, res: Response) => {
    try {
      const { id_cliente_alm } = req.params;
      const cliente = await Cliente_AlmacenService.getByIDFlexible(id_cliente_alm);
      if (!cliente) {
        res.status(404).json({ mensaje: 'Cliente no encontrado.' });
        return;
      }
      const nuevoEstatus = !cliente.activo_cliente_alm;
      await Cliente_AlmacenService.update(id_cliente_alm, { activo_cliente_alm: nuevoEstatus } as any);
      res.status(200).json({ ok: true, activo_cliente_alm: nuevoEstatus });
    } catch (error) {
      res.status(500).json({ mensaje: 'Error al cambiar estatus del cliente.' });
    }
  };

  /**
   * GET /cliente_almacen/saldos
   * Lo que debe cada cliente (cuentas por cobrar pendientes, parciales o vencidas) y qué parte ya venció.
   * Es la misma deuda que usa el sistema para validar el límite de crédito. Solo trae clientes con saldo.
   */
  static getSaldos = async (_req: Request, res: Response) => {
    try {
      const filas = await dbLocal.query<any>(`
        SELECT cxc.id_cliente_alm,
               COALESCE(SUM(cxc.saldo_pendiente), 0) AS saldo,
               COALESCE(SUM(cxc.saldo_pendiente) FILTER (WHERE cxc.fecha_vencimiento < CURRENT_DATE), 0) AS vencido,
               COUNT(*) AS cuentas
        FROM cuenta_por_cobrar cxc
        WHERE cxc.estatus_cxc IN ('PEN', 'PAR', 'VEN') AND cxc.saldo_pendiente > 0
        GROUP BY cxc.id_cliente_alm
      `, { type: QueryTypes.SELECT });
      const saldos: Record<string, { saldo: number; vencido: number; cuentas: number }> = {};
      for (const f of filas) {
        saldos[f.id_cliente_alm] = { saldo: Number(f.saldo), vencido: Number(f.vencido), cuentas: Number(f.cuentas) };
      }
      res.status(200).json(saldos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al obtener los saldos de los clientes.' });
    }
  };

  /**
   * PATCH /cliente_almacen/:id_cliente_alm/limite-credito   Body: { limite_credito: number }
   * Solo administradores (prioridad <= 2). 0 = sin límite.
   */
  static actualizarLimiteCredito = async (req: AuthedRequest, res: Response) => {
    try {
      const prioridad = (req.user as any)?.prioridad;
      if (prioridad == null || Number(prioridad) > 2) {
        res.status(403).json({ mensaje: 'Solo un administrador puede cambiar el límite de crédito.' });
        return;
      }
      const { id_cliente_alm } = req.params;
      const limite = Number(req.body?.limite_credito);
      if (!Number.isFinite(limite) || limite < 0 || limite > 9_999_999_999) {
        res.status(400).json({ mensaje: 'El límite de crédito debe ser un número de 0 en adelante (0 = sin límite).' });
        return;
      }
      const cliente = await Cliente_AlmacenService.getByIDFlexible(id_cliente_alm);
      if (!cliente) {
        res.status(404).json({ mensaje: 'Cliente no encontrado.' });
        return;
      }
      const anterior = Number(cliente.limite_credito_cliente_alm ?? 0);
      const nuevo = +limite.toFixed(2);
      await Cliente_AlmacenService.update(cliente.id_cliente_alm, { limite_credito_cliente_alm: nuevo } as any);
      console.log(`[Cliente ${cliente.nom_corto_cliente_alm}] ${req.user?.username ?? 'desconocido'} cambió el límite de crédito: ${anterior} -> ${nuevo}`);
      res.status(200).json({ ok: true, limite_credito_cliente_alm: nuevo, anterior });
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al cambiar el límite de crédito.' });
    }
  };
}

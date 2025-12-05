import type { Request, Response } from 'express';
import { LotesArticuloSucursalService } from '../../services/LoteYCaducidades/Lote_ArticuloSucursal.service';

export class LotesArticuloSucursalController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const cajas = await LotesArticuloSucursalService.getAll();
      res.status(200).json(cajas);
    } catch (error) {
      console.error(error);
      res.status(500).json({
        mensaje: 'Error al encontrar todas los Lotes Articulo sucursal.'
      });
    }
  };

  static getExistencia = async (req: Request, res: Response) => {
    try {
      const { id_artic, id_sucursal } = req.params;

      const existencia = await LotesArticuloSucursalService.getExistencia(id_artic, id_sucursal);

      res.status(200).json(existencia);
    } catch (error: any) {
      console.error('getExistencia:', error);
      res.status(500).json({ mensaje: 'Error al obtener existencia.' });
    }
  };

  static getAllByEmpresaArticulo = async (req: Request, res: Response) => {
    try {
      const { id_empre, id_artic } = req.params;

      const conStock = String(req.query.conStock ?? 'false').toLowerCase() === 'true';
      const noVencidos = String(req.query.noVencidos ?? 'false').toLowerCase() === 'true';
      const estado = req.query.estado ? String(req.query.estado) : undefined;
      const ordenar = (req.query.ordenar as 'fefo' | 'fifo' | 'recientes') || 'fefo';

      const lotes = await LotesArticuloSucursalService.getAllByEmpresaArticulo(id_empre, id_artic, {
        conStock,
        estado,
        noVencidos,
        ordenar
      });

      res.status(200).json(lotes);
    } catch (error: any) {
      if (error?.message?.includes('Faltan id_empre o id_artic')) {
        res.status(400).json({ mensaje: error.message });
      }
      console.error('getAllByEmpresaArticulo:', error);
      res.status(500).json({ mensaje: 'Error al obtener lotes.' });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const caja = await LotesArticuloSucursalService.getById(id);
      res.status(200).json(caja);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al encontrar Lotes Articulo sucursal.' });
    }
  };
  static getLotesPorCodigoBarra = async (req: Request, res: Response) => {
    try {
      const { id_empresa, cod_barr_artic } = req.params;
      const lotes = await LotesArticuloSucursalService.getLotesPorCodigoBarra(id_empresa, cod_barr_artic);
      res.status(200).json({
        cantidad: lotes
      });
    } catch (error) {
      console.error('Error en getLotesPorCodigoBarra:', error);
      res.status(500).json({ mensaje: 'Error al obtener la cantidad de lotes por codigo.' });
    }
  };

  static getResumenLotes = async (req: Request, res: Response) => {
    try {
      const { nombre, grupoPrecio, id_sucursal, page, limit } = req.query;
      //console.log(nombre);
      const data = await LotesArticuloSucursalService.getResumen({
        nombre: nombre.toString(),
        grupoPrecio: grupoPrecio?.toString(),
        id_sucursal: id_sucursal.toString(),
        page: Number(page),
        limit: Number(limit)
      });

      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al obtener resumen de lotes' });
    }
  };
  static getResumenPromocion = async (req: Request, res: Response) => {
    try {
      const { id_cliente, grupoPrecio, id_sucursal, page, limit } = req.query;
      //console.log(nombre);
      const data = await LotesArticuloSucursalService.getResumenPromocion({
        id_cliente: id_cliente.toString(),
        grupoPrecio: grupoPrecio?.toString(),
        id_sucursal: id_sucursal.toString(),
        page: Number(page),
        limit: Number(limit)
      });
      console.log(data);
      res.status(200).json(data);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al obtener resumen de lotes' });
    }
  };

  // static repartirCantidadEntreLotes = async (req: Request, res: Response) => {
  //   try {
  //     const { cod_barr_artic } = req.params;
  //     const cantidadSolicitada = Number(req.query.cantidad); // o puede ser req.body.cantidad, según cómo quieras

  //     if (
  //       !cod_barr_artic ||
  //       isNaN(cantidadSolicitada) ||
  //       cantidadSolicitada <= 0
  //     ) {
  //       res.status(400).json({ mensaje: "Parámetros inválidos" });
  //     }

  //     const lotesParaVenta =
  //       await LotesArticuloSucursalService.repartirCantidadEntreLotes(
  //         cod_barr_artic,
  //         cantidadSolicitada
  //       );

  //     res.status(200).json(lotesParaVenta);
  //   } catch (error: any) {
  //     console.error("Error en repartirCantidadEntreLotes:", error.message);
  //     res.status(500).json({ mensaje: error.message });
  //   }
  // };
  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoLote = await LotesArticuloSucursalService.create(data);
      res.status(201).json(nuevoLote);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: 'Error al crear Lotes Articulo sucursal.' });
    }
  };

  /*
    static updateByID = async (req: Request, res: Response) => {
      try {
        const { id_lote_sucursal } = req.params;
        const data = req.body;
        const updateLote = await LotesArticuloSucursalService.update(
          id_lote_sucursal,
          data
        );
        res
          .status(201)
          .json({
            mensaje: "Lotes Articulo sucursal actualizado correctamente.",
            id_lote_sucursal: updateLote,
          });
      } catch (error) {
        console.error(error);
        res
          .status(500)
          .json({ mensaje: "Error al actualizar Lotes Articulo sucursal." });
      }
    };*/
}

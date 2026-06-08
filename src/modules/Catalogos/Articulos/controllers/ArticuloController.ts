import type { Request, Response } from 'express';
import { ArticuloService } from '../services/articulo.service';
import { ArticuloRepository } from '../repositories/Articulo.repository';
import { DetalleListaPreciosRepository } from '../../../Comercial/Precios/repositories/Detalle_Lista_Precio.repository';

export class ArticuloController {
  static getAllPaginados = async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const query = (req.query.query as string) || '';

      const TodosArticulosParaCompra = await ArticuloService.getAllPaginado(page, limit, query);
      res.status(200).json(TodosArticulosParaCompra);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener los artículos.' });
    }
  };
  static getBycodBarroNombre = async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      const articulos = await ArticuloService.getBycodBarroNombre(query);
      res.status(200).json(articulos);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al buscar los artículos.' });
    }
  };
  static getByCodigoBarras = async (req: Request, res: Response) => {
    try {
      const { cod_barr_artic } = req.params;
      const articulo = await ArticuloService.getByCodigoBarras(cod_barr_artic);
      res.status(200).json(articulo);
    } catch (error) {

    }
  }
  static getAllParaVenta = async (req: Request, res: Response) => {
    try {
      const id_empresa = req.query.id_empresa as string;
      const { cantidad, cod_barr_artic } = req.params;

      const resultado = await ArticuloService.getAllParaVenta(id_empresa, Number(cantidad), cod_barr_artic);
      res.status(200).json(resultado);
    } catch (error: any) {
      console.error('Error en getAllParaVenta:', error.message);
      res.status(500).json({ message: error.message });
    }
  };

  static getAllParaCompra = async (req: Request, res: Response) => {
    try {
      const { id_empresasucursal } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const TodosArticulosParaCompra = await ArticuloService.getAllPagProductosParaCompra(
        page,
        limit,
        id_empresasucursal
      );
      // console.log(TodosArticulosParaCompra)
      res.status(200).json(TodosArticulosParaCompra);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener todos los articulo.' });
    }
  };

  static getAllArticulosNegadosParaCompra = async (req: Request, res: Response) => {
    try {
      const { id_empresa_sucursal } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const articulosNegados = await ArticuloService.getAllArticulosNegadosParaCompra(id_empresa_sucursal, page, limit);
      console.log(articulosNegados)
      res.status(200).json(articulosNegados);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener todos los artículos negados.' });
    }
  };

  static getPaginaArticuloParaContinuarCompra = async (req: Request, res: Response) => {
    try {
      const { id_artic } = req.params;
      const limit = parseInt(req.query.limit as string) || 1;

      const pagina = await ArticuloService.obtenerPaginaDeArticulo(id_artic, limit);
      res.json({ pagina });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ mensaje: error.message || 'Error al calcular la página del artículo' });
    }
  };
  static getByID = async (req: Request, res: Response) => {
    try {
      const { id_articulo } = req.params;
      const articulo = await ArticuloService.getByID(id_articulo);
      res.status(200).json(articulo);
    } catch (error) {
      // console.error( error);
      res.status(500).json({ mensaje: 'Error al encontrar todos los articulos.' });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      console.log(data);
      const newArticulo = await ArticuloService.createArticulo(data);
      res.status(201).json({ mensaje: 'Articulo creado correctamente.', articulo: newArticulo });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al crear el articulo.' });
    }
  };

  static actualizarByID = async (req: Request, res: Response) => {
    try {
      const { id_articulo } = req.params;
      const data = req.body;
      const updateArticulo = await ArticuloService.updateByID(id_articulo, data);
      res.status(200).json({ mensaje: 'Articulo actualizado correctamente.', articulo: updateArticulo });
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error al actualizar el articulo.' });
    }
  };

  // GET /articulo/:id_artic/panel-precios
  static getPanelPrecios = async (req: Request, res: Response) => {
    try {
      const { id_artic } = req.params;
      const panel = await ArticuloRepository.getPanelPrecios(id_artic);
      res.status(200).json(panel);
    } catch (error: any) {
      console.error(error);
      res.status(error.message === 'Artículo no encontrado.' ? 404 : 500)
         .json({ message: error.message ?? 'Error al obtener el panel de precios.' });
    }
  };

  // PUT /articulo/:id_artic/precio
  // Body: { id_lista_precio, precios }
  static upsertPrecio = async (req: Request, res: Response) => {
    try {
      const { id_artic } = req.params;
      const { id_lista_precio, precios } = req.body as { id_lista_precio: string; precios: number };
      if (!id_lista_precio || precios == null) {
        res.status(400).json({ message: 'id_lista_precio y precios son requeridos.' });
        return;
      }
      const result = await DetalleListaPreciosRepository.updateOrCreate({
        id_artic,
        id_lista_precio,
        precios: Number(precios),
      });
      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message ?? 'Error al actualizar el precio.' });
    }
  };
}

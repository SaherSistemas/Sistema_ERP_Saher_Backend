import type { Request, Response } from 'express';
import type { AuthedRequest } from '../../../../middleware/auth';
import { ArticuloRepository } from '../repositories/Articulo.repository';
import { DetalleListaPreciosRepository } from '../../../Comercial/Precios/repositories/Detalle_Lista_Precio.repository';
import { Stock_Ubicacion_LoteRepository } from '../../../Inventario/Stock/repositories/Stock_Ubicacion_Lote.repository';
import { ArticuloService } from '../services/articulo.service';
import Articulo from '../model/Articulo';
import ListaPrecio from '../../../Comercial/Precios/model/Lista_Precio';
import { dbPoly } from '../../../../config/db';
import { QueryTypes } from 'sequelize';
import { LotesArticuloSucursalRepository } from '../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository';
import { Empresa_SucursalRepository } from '../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository';
import { Grupo_Empresa_Lista_PrecioRepository } from '../../../Comercial/Precios/repositories/Grupo_Empresa_Lista_Precio.repository';
import { Margen_Ganancia_ListaRepository } from '../../../Comercial/Precios/repositories/Margen_Ganancia_Lista.repository';
import { Margen_Especial_ArticuloRepository } from '../../../Comercial/Precios/repositories/Margen_Especial_Articulo.repository';

async function _syncPrecioPolyDB(
    cod_int_artic: number,
    cod_int_lista_precio: number,
    precio: number,
): Promise<void> {
    const [costoRow] = await dbPoly.query<{ almcosprn: number }>(
        `SELECT almcosprn FROM almacenes1 WHERE artcdartn = :codArtic AND almcdalmn = 1 LIMIT 1`,
        { type: QueryTypes.SELECT, replacements: { codArtic: cod_int_artic } }
    );
    const costo = Number((costoRow as any)?.almcosprn ?? 0);
    const margen = precio > 0 ? ((precio - costo) / precio) * 100 : 0;
    await dbPoly.query(`
        INSERT INTO preciogpo (grpcdgrpn, artcdartn, grpprecin, grpcoston, grpmargen, grpstatuc, grpfechad, grppreofn, grpfecofD, grppzalmn, grpmulOfc)
        VALUES (:codGrupo, :codArtic, :precio, :costo, :margen, 'A', CURRENT_DATE, NULL, NULL, NULL, 'N')
        ON CONFLICT (grpcdgrpn, artcdartn)
        DO UPDATE SET
            grpprecin = EXCLUDED.grpprecin,
            grpcoston = EXCLUDED.grpcoston,
            grpmargen = EXCLUDED.grpmargen,
            grpstatuc = 'A',
            grpfechad = CURRENT_DATE
    `, {
        type: QueryTypes.INSERT,
        replacements: { codGrupo: cod_int_lista_precio, codArtic: cod_int_artic, precio, costo, margen },
    });
}

export class ArticuloController {
  static getAllPaginados = async (req: AuthedRequest, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const query = (req.query.query as string) || '';
      const id_empresa_sucursal = req.user?.id_empresa;

      const TodosArticulosParaCompra = await ArticuloService.getAllPaginado(page, limit, query, id_empresa_sucursal);
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
      //console.error(error);
      res.status(500).json({ message: 'Error al buscar los artículos.' });
    }
  }
  static getAllParaVenta = async (req: Request, res: Response) => {
    try {
      const id_empresa = req.query.id_empresa as string;
      const { cantidad, cod_barr_artic } = req.params;
      console.log('id_empresa:', id_empresa, 'cantidad:', cantidad, 'cod_barr_artic:', cod_barr_artic);
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
      const q = (req.query.q as string)?.trim() || '';

      const TodosArticulosParaCompra = await ArticuloService.getAllPagProductosParaCompra(
        page,
        limit,
        id_empresasucursal,
        q
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

  // GET /articulo/:id_artic/existencia
  static getExistencia = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_artic } = req.params;
      const id_empresa = req.user?.id_empresa as string;
      const result = await Stock_Ubicacion_LoteRepository.getExistencias(id_empresa, id_artic);
      res.status(200).json({ existencia_disponible: result.existencia_disponible });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener la existencia.' });
    }
  };

  // GET /articulo/:id_artic/panel-precios
  static getPanelPrecios = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_artic } = req.params;
      const id_empresa = req.user?.id_empresa as string;
      const panel = await ArticuloRepository.getPanelPrecios(id_artic, id_empresa);
      res.status(200).json(panel);
    } catch (error: any) {
      console.error(error);
      res.status(error.message === 'Artículo no encontrado.' ? 404 : 500)
        .json({ message: error.message ?? 'Error al obtener el panel de precios.' });
    }
  };

  // POST /articulo/:id_artic/recalcular-precios
  // Body: { id_empresa }
  static recalcularPrecios = async (req: AuthedRequest, res: Response) => {
    try {
      const { id_artic } = req.params;
      const id_empresa: string = req.body?.id_empresa ?? req.user?.id_empresa;
      if (!id_empresa) {
        res.status(400).json({ message: 'id_empresa es requerido.' });
        return;
      }

      const modeloArticulo = await ArticuloRepository.getByPK(id_artic);
      if (!modeloArticulo) { res.status(404).json({ message: 'Artículo no encontrado.' }); return; }

      const grupoEmpresa = await Empresa_SucursalRepository.getGrupo(id_empresa);
      if (!grupoEmpresa) { res.status(400).json({ message: 'Empresa sin grupo.' }); return; }

      const empresas = await Empresa_SucursalRepository.getEmpresasPorGrupo(grupoEmpresa.idgrup_empre);

      // Costo promedio actual basado en stock_ubicacion_lote (sin lote nuevo)
      const { costoPromedio, totalCantidad } =
        await LotesArticuloSucursalRepository.llevarmeCostosDeLotesExistentesEnVariasEmpresas(
          id_artic, empresas, modeloArticulo.cod_int_artic, 0
        );

      if (totalCantidad === 0 || costoPromedio <= 0) {
        res.status(400).json({ message: 'Sin existencias con costo para recalcular.' });
        return;
      }

      // Actualizar costo en PolyDB almacenes1
      if (modeloArticulo.cod_int_artic) {
        await dbPoly.query(`
          INSERT INTO public.almacenes1 (empcdempn, almcdalmn, artcdartn, almultctn, almcfeultd, almcosprn, almexistn)
          VALUES (99999, 1, :codIntArtic, :costoPromedio, NOW(), :costoPromedio, 0)
          ON CONFLICT (empcdempn, almcdalmn, artcdartn)
          DO UPDATE SET almultctn = EXCLUDED.almultctn, almcfeultd = EXCLUDED.almcfeultd, almcosprn = EXCLUDED.almcosprn
        `, { type: QueryTypes.INSERT, replacements: { codIntArtic: modeloArticulo.cod_int_artic, costoPromedio } });
      }

      const listasDePrecioGrupo = await Grupo_Empresa_Lista_PrecioRepository
        .getSoloListasDePrecioPorIDGrupo(grupoEmpresa.idgrup_empre);
      const idsListasGrupo = listasDePrecioGrupo.map(l => l.id_list_precio);

      const margenesCat = (await Margen_Ganancia_ListaRepository.getByProducto(
        modeloArticulo.id_categoria, modeloArticulo.id_presentacion
      )).filter(m => idsListasGrupo.includes(m.id_lista_precio));
      const margenesCatMap = new Map(margenesCat.map(m => [m.id_lista_precio, Number(m.margen)]));

      const preciosActualizados: { lista: string; precio: number }[] = [];

      for (const idLista of idsListasGrupo) {
        let margenPct: number | null = await Margen_Especial_ArticuloRepository
          .getMargenVigenteByListaYArticulo(idLista, id_artic);
        if (margenPct === null) margenPct = margenesCatMap.get(idLista) ?? null;
        if (margenPct === null) continue;

        const divisor = 1 - (margenPct / 100);
        if (divisor <= 0) continue;

        const precio = costoPromedio / divisor;
        if (!Number.isFinite(precio) || precio <= 0) continue;

        await DetalleListaPreciosRepository.updateOrCreate({ id_lista_precio: idLista, id_artic, precios: precio });

        // Sync PolyDB preciogpo
        try {
          const listaRow = await ListaPrecio.findByPk(idLista, { attributes: ['cod_int_lista_precio'], raw: true }) as any;
          const codGrupo = listaRow?.cod_int_lista_precio;
          console.log(`[PolyDB] lista=${idLista} codGrupo=${codGrupo} codArtic=${modeloArticulo.cod_int_artic} precio=${precio} costo=${costoPromedio}`);
          if (codGrupo != null && modeloArticulo.cod_int_artic != null) {
            const margenPoly = precio > 0 ? ((precio - costoPromedio) / precio) * 100 : 0;
            await dbPoly.query(`
              UPDATE preciogpo
              SET grpprecin = :precio,
                  grpcoston = :costo,
                  grpmargen = :margen,
                  grpstatuc = 'A',
                  grpfechad = CURRENT_DATE
              WHERE grpcdgrpn = :codGrupo AND artcdartn = :codArtic
            `, { type: QueryTypes.UPDATE, replacements: { codGrupo, codArtic: modeloArticulo.cod_int_artic, precio, costo: costoPromedio, margen: margenPoly } });
            console.log(`[PolyDB] UPDATE preciogpo grpcdgrpn=${codGrupo} artcdartn=${modeloArticulo.cod_int_artic} OK`);
          }
        } catch (polyErr) {
          console.error('[PolyDB] Error actualizando preciogpo:', polyErr);
        }

        preciosActualizados.push({ lista: idLista, precio });
      }

      res.status(200).json({ costoPromedio, totalCantidad, preciosActualizados: preciosActualizados.length });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message ?? 'Error al recalcular precios.' });
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

      // Sincronizar precio en PolyDB
      try {
        const [artRaw, listaRaw] = await Promise.all([
          Articulo.findByPk(id_artic, { attributes: ['cod_int_artic'], raw: true }),
          ListaPrecio.findByPk(id_lista_precio, { attributes: ['cod_int_lista_precio'], raw: true }),
        ]);
        const cod_int_artic = (artRaw as any)?.cod_int_artic;
        const cod_int_lista = (listaRaw as any)?.cod_int_lista_precio;
        if (cod_int_artic && cod_int_lista) {
          await _syncPrecioPolyDB(cod_int_artic, cod_int_lista, Number(precios));
        }
      } catch (polyErr) {
        console.error('Error sincronizando precio en PolyDB:', polyErr);
      }

      res.status(200).json(result);
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ message: error.message ?? 'Error al actualizar el precio.' });
    }
  };
}

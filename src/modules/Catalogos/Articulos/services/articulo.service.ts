import { ICreateOrUpdateArticulo } from "../interface/Articulo.interface";
import { ArticuloRepository } from "../repositories/Articulo.repository";
export const ArticuloService = {
  getAllPaginado: async (
    page: number = 1,
    limit: number,
    query: string = ""
  ) => {
    return await ArticuloRepository.getAllPag(page, limit, query);
  },
  getByCodigoBarras:async(cod_barr_artic: string) => {
    return await ArticuloRepository.getByCodigoBarras(cod_barr_artic);
  },
  getAllParaVenta: async (
    id_empresa: string,
    cantidad: number,
    cod_barr_artic: string
  ) => {
    return await ArticuloRepository.getAllParaVenta(
      id_empresa,
      cantidad,
      cod_barr_artic
    );
  },

  getAllPagProductosParaCompra: async (
    page: number = 1,
    limit: number,
    id_empresasucursal: string
  ) => {
    return await ArticuloRepository.getAllPagProductosParaCompra(
      page,
      limit,
      id_empresasucursal
    );
  },
  getAllArticulosNegadosParaCompra: async (
    id_empresa_sucursal: string,
    page: number = 1,
    limit: number
  ) => {
    return await ArticuloRepository.getArticulosNegadosParaCompra(
      id_empresa_sucursal,
      page,
      limit
    );
  },
  obtenerPaginaDeArticulo: async (id_artic: string, limit: number) => {
    const codigos = await ArticuloRepository.getAll(); // retorna [{ id_artic: '...' }, ...]
    const ids = codigos.map((art) => art.id_artic);
    const index = ids.findIndex((codigo) => codigo === id_artic);
    if (index === -1) {
      throw new Error("Artículo no encontrado");
    }
    const pagina = Math.floor(index / limit) + 1;

    return pagina;
  },
  getByID: async (id: string) => {
    return await ArticuloRepository.getByIDFlexible(id);
  },

  createArticulo: async (data: ICreateOrUpdateArticulo) => {
    return await ArticuloRepository.createArticulo(data);
  },

  updateByID: async (id_articulo: string, data: ICreateOrUpdateArticulo) => {
    return await ArticuloRepository.updateArticulo(id_articulo, data);
  },
};

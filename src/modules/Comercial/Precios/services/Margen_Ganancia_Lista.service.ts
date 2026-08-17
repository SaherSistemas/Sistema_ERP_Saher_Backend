import { IMargen_Ganancia_ListaCreate } from "../interface/Marge_Ganancia_Lista.interface";
import { Margen_Ganancia_ListaRepository } from "../repositories/Margen_Ganancia_Lista.repository";
import { Empresa_SucursalRepository } from "../../../../repository/Empresa_Sucursal/Empresa_Sucursal.repository";
import { Grupo_Empresa_Lista_PrecioRepository } from "../repositories/Grupo_Empresa_Lista_Precio.repository";
import { LotesArticuloSucursalRepository } from "../../../Inventario/Lotes/repository/Lote_ArticuloSucursal.repository";
import { Margen_Especial_ArticuloRepository } from "../repositories/Margen_Especial_Articulo.repository";
import { DetalleListaPreciosRepository } from "../repositories/Detalle_Lista_Precio.repository";
import { ICreateOrUpdateIDetalleListaPrecio } from "../interface/Detalle_Lista_Pecios.interface";
import { ArticuloRepository } from "../../../Catalogos/Articulos/repositories/Articulo.repository";
import { ListaPrecioRepository } from "../repositories/Lista_Precio.repository";

export const Margen_Ganancia_ListaService = {
    getAll: async () => {
        return await Margen_Ganancia_ListaRepository.getAll();
    },

    getPorProducto: async (id_categoria: string, id_presentacion: string) => {
        return await Margen_Ganancia_ListaRepository.getByProducto(id_categoria, id_presentacion);
    },

    create: async (data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_ListaRepository.create(data);
    },

    update: async (id_margen: string, data: IMargen_Ganancia_ListaCreate) => {
        return await Margen_Ganancia_ListaRepository.update(id_margen, data);
    },

    getArticulosPendientes: async () => {
        return await Margen_Ganancia_ListaRepository.getArticulosPendientes();
    },

    recalcularPreciosArticulo: async (id_artic: string, id_empresa: string) => {
        const articulo = await ArticuloRepository.getByPK(id_artic);
        if (!articulo) throw new Error('Artículo no encontrado');

        const grupoEmpresa = await Empresa_SucursalRepository.getGrupo(id_empresa);
        if (!grupoEmpresa) throw new Error('No se encontró grupo para la empresa');

        const empresas = await Empresa_SucursalRepository.getEmpresasPorGrupo(grupoEmpresa.idgrup_empre);
        const listasDePrecio = await Grupo_Empresa_Lista_PrecioRepository.getSoloListasDePrecioPorIDGrupo(grupoEmpresa.idgrup_empre);
        let idsListas = listasDePrecio.map((l: any) => l.id_list_precio);

        // Fallback: si el grupo no tiene listas asignadas, usar todas las listas activas
        if (idsListas.length === 0) {
            const todasLasListas = await ListaPrecioRepository.getAll();
            idsListas = todasLasListas.map((l: any) => l.id_lista_precio);
        }

        if (idsListas.length === 0) throw new Error('No hay listas de precio configuradas en el sistema');

        const { costoPromedio, totalCantidad } =
            await LotesArticuloSucursalRepository.llevarmeCostosDeLotesExistentesEnVariasEmpresas(id_artic, empresas);

        if (totalCantidad === 0 || costoPromedio === 0) {
            throw new Error('El artículo no tiene lotes con costo registrado');
        }

        const margenesTipo = (await Margen_Ganancia_ListaRepository.getByProducto(
            articulo.id_categoria,
            articulo.id_presentacion
        )).filter((m: any) => idsListas.includes(m.id_lista_precio));
        const margenesTipoMap = new Map(margenesTipo.map((m: any) => [m.id_lista_precio, Number(m.margen)]));

        const listasActualizadas: string[] = [];

        for (const idLista of idsListas) {
            let margenPct = await Margen_Especial_ArticuloRepository.getMargenVigenteByListaYArticulo(idLista, id_artic);
            if (margenPct === null) margenPct = margenesTipoMap.get(idLista) ?? null;
            if (margenPct === null) continue;

            const divisor = 1 - (margenPct / 100);
            if (divisor <= 0) continue;
            const precio = costoPromedio / divisor;
            if (!Number.isFinite(precio) || precio <= 0) continue;

            const detalle: ICreateOrUpdateIDetalleListaPrecio = {
                id_lista_precio: idLista,
                id_artic,
                precios: precio,
            };
            await DetalleListaPreciosRepository.updateOrCreate(detalle);
            listasActualizadas.push(idLista);
        }

        return {
            id_artic,
            costo_promedio: costoPromedio,
            listas_actualizadas: listasActualizadas.length,
        };
    },
}

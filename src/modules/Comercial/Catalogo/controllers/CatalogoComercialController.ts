import { Request, Response } from "express";
import { AuthedRequest } from "../../../../middleware/auth";
import { CatalogoComercialService } from "../services/CatalogoComercial.service";
import { GetConsultaBusquedaQueryDTO, GetResumenPromocionQueryDTO } from "../dto/GetResumenPromocionQueryDTO";

export const CatalogoComercialController = {
    getCatalagoComercialArticulosPromocionadosAlmacen: async (req: AuthedRequest, res: Response) => {
        try {

            const id_sucursal = req.user?.id_empresa
            const filters: GetResumenPromocionQueryDTO = {
                id_cliente: String(req.query.id_cliente),
                id_sucursal: String(id_sucursal),
                grupoPrecio: String(req.query.grupoPrecio),
                page: Number(req.query.page),
                limit: Number(req.query.limit),
            };

            //console.log(nombre);
            const data = await CatalogoComercialService.getCatalagoComercialArticulosPromocionadosAlmacen(filters);
            //   console.log(data);
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: 'Error al obtener resumen de lotes' });
        }
    },
    getCatalagoComercialArticulosBusqueda: async (req: AuthedRequest, res: Response) => {
        try {
            const id_sucursal = req.user?.id_empresa
            const filters: GetConsultaBusquedaQueryDTO = {
                nombre: String(req.query.nombre),
                grupoPrecio: String(req.query.grupoPrecio),
                id_sucursal: String(id_sucursal),
                page: Number(req.query.page),
                limit: Number(req.query.limit),
            };

            //console.log(nombre);
            const data = await CatalogoComercialService.getCatalagoComercialArticulosBusqueda(filters);
            //   console.log(data);
            res.status(200).json(data);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: 'Error al obtener resumen de lotes' });
        }
    },


};

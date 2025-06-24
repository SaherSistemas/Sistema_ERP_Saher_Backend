import type { Request, Response } from "express";
import { Parametros_CompraService } from "../../services/Compras/Parametros_Compra.service";
import { ICreateOrUpdateParametros_Compra } from "../../interface/Compras/Parametros_Compra/Parametros_Compra.interface";

export class Parametros_CompraController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosLosParametrosEmpresas = await Parametros_CompraService.getAll();
            res.status(200).json({ mensaje: todosLosParametrosEmpresas })
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener todos los parametros de las empresas." });
        }
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const { id_parametro_comp } = req.params;
            const parametro_compra = await Parametros_CompraService.getByID(id_parametro_comp)
            res.status(200).json(parametro_compra)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "No se encontro la parametro compra." });
        }
    }

    static getByIdEmpresa = async (req: Request, res: Response) => {
        try {
            const { id_empresa } = req.params;
            const parametro_compra = await Parametros_CompraService.getByIDEmpresa(id_empresa)
            res.status(200).json(parametro_compra)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "No se encontro la parametro compra." });
        }
    }


    static crearParametro = async (req: Request<ICreateOrUpdateParametros_Compra>, res: Response) => {
        try {
            const data = req.body
            const newParametro = await Parametros_CompraService.createParametro(data)
            res.status(201).json({ mensaje: "Parametro creado correctamente.", parametro_compra: newParametro });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al crear la parametro_compra." });
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_parametro_comp } = req.params
            const data: ICreateOrUpdateParametros_Compra = req.body
            const updateParametroCompra = await Parametros_CompraService.updateParametro(id_parametro_comp, data)
            res.status(201).json({ mensaje: "Parametros de compra actualizados correctamente.", parametro_compra: updateParametroCompra });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al modificar la parametro_compra." });
        }
    }




}
import type { Request, Response } from "express";
import { TipoClienteService } from "../../services/Clientes/tipo_cliente.service";


export class TipoClienteController {

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoTipoCliente = await TipoClienteService.createCliente(data);
            res.status(201).json(nuevoTipoCliente);
            } catch (error) {
             console.error(error);
             res.status(500).json({ mensaje: "Error al crear el tipo cliente." });
            }
        }  

    static getAll = async (req: Request, res: Response) => {
        try {
            const tiposClientes = await TipoClienteService.getAll();
            res.status(200).json(tiposClientes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar todos los tipos de clientes." });
        }
    }

    static getByIDFlexible = async (req: Request, res: Response) => {
    try {
      const id_o_nombre = req.params.id_o_nombre; // nombre que le pongas en la ruta
      const tipoCliente = await TipoClienteService.getByIDFlexible(id_o_nombre);

      if (!tipoCliente) {
         res.status(404).json({ mensaje: "Tipo de cliente no encontrado." });
      }

      res.status(200).json(tipoCliente);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al buscar el tipo de cliente." });
    }
  }
}

import type { Request, Response } from "express";
import { BeneficioClienteService } from "../../services/Clientes/beneficio_cliente.service";    


export class BeneficioClienteController {

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoBeneficioCliente = await BeneficioClienteService.createBeneficio(data);
            res.status(201).json(nuevoBeneficioCliente);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear el beneficio del cliente." });
        }
    }  

    static getAll = async (req: Request, res: Response) => {
        try {
            const beneficiosClientes = await BeneficioClienteService.getAll();
            res.status(200).json(beneficiosClientes);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar todos los beneficios de clientes." });
        }
    }
}
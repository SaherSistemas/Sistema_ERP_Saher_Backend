import type { Request, Response } from "express";
import { ClienteService } from "../../services/VentaMostrador/cliente.service"; 


export class ClienteController {

        static getByID = async (req: Request, res: Response) => {
                try {
                    const { id_cliente } = req.params;
                    const cliente = await ClienteService.getByIDFlexible(id_cliente)
                    res.status(200).json(cliente)
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al encontrar todos los clientes." });
                }
            }
        static create = async (req: Request, res: Response) => {
                try {
                    const data = req.body;
                    const nuevoCliente = await ClienteService.createCliente(data);
                    res.status(201).json(nuevoCliente);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al crear el cliente." });
                }
            }
    }

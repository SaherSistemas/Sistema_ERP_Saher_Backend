import type { Request, Response } from "express";
import { ClienteService } from "../../services/Clientes/cliente.service"; 


export class ClienteController {

        static getAll = async (req: Request, res: Response) => {
                try {
                    const clientes = await ClienteService.getAll();
                    res.status(200).json(clientes);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al encontrar todos los clientes." });
                }
        }

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
        static actualizarByID = async (req: Request, res: Response) => {
                try {
                    const { id_cliente } = req.params;
                    const data = req.body;
                    const clienteActualizado = await ClienteService.updateCliente(id_cliente, data);
                    res.status(200).json(clienteActualizado);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al actualizar el cliente." });
                }
            }
        static actualizarStatusByID = async (req: Request, res: Response) => {
                try {
                    const { id_cliente } = req.params;
                    const clienteActualizado = await ClienteService.updateStatusCliente(id_cliente);
                    res.status(200).json(clienteActualizado);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al actualizar el estado del cliente." });
                }
            }
    }

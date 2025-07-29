import type { Request, Response } from "express";
import { MonederoService } from "../../../services/Clientes/Monedero/Monedero.service"; 


export class MonederoController {
        static getAll = async (req: Request, res: Response) => {
                try {
                    const monedero = await MonederoService.getAll();
                    res.status(200).json(monedero);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al encontrar todos los monederos." });
                }
        }

        static getByID = async (req: Request, res: Response) => {
                try {
                    const { id_monedero } = req.params;
                    console.log(id_monedero);
                    const monedero = await MonederoService.getByIDFlexible(id_monedero)
                  // console.log(cliente)
                    res.status(200).json(monedero)
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al encontrar todos monederos." });
                }
            }
         static create = async (req: Request, res: Response) => {
                try {
                    const data = req.body;
                    const nuevoMonedero = await MonederoService.createMonedero(data);
                    res.status(201).json(nuevoMonedero);
                } catch (error) {
                    console.error(error);
                    res.status(500).json({ mensaje: "Error al crear el monedero." });
                }
            }

        static deleteMonedero = async (req: Request, res: Response) => {
            const { id } = req.params;
                try {
                const resultado = await MonederoService.deleteMonedero(id);
                 res.status(200).json({
                    success: true,
                    message: resultado.message
                });
                } catch (error: any) {
                 res.status(400).json({
                    success: false,
                    message: error.message || "Error eliminando el monedero"
                });
    }
  }
    
    }

import type { Request, Response } from "express";
import {LotesUsadoVentaService} from "../../services/LoteYCaducidades/Lote_Usado_Venta.servide"


export class LoteUsadoVentaController  {

    static getAll = async (req: Request, res: Response) => {
            try {
                const cajas = await LotesUsadoVentaService.getAll();
                res.status(200).json(cajas);
            } catch (error) {
                console.error(error);
                res.status(500).json({ mensaje: "Error al encontrar todas los Lotes Usado Venta." });
            }
        }
    
    static getByID = async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                const caja = await LotesUsadoVentaService.getById(id);
                res.status(200).json(caja);
            } catch (error) {
                console.error(error);
                res.status(500).json({ mensaje: "Error al encontrar Lotes Usado Venta." });
            }
        }

    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevoLote = await LotesUsadoVentaService.create(data);
            res.status(201).json(nuevoLote);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear Lotes Usado Venta." });
        }
    }

    // static updateByID = async (req: Request, res: Response) => {
    //     try {
    //         const { id_lote_sucursal } = req.params;
    //         const data = req.body;
    //         const updateLote = await LotesUsadoVentaService.update(id_lote_sucursal , data);
    //         res.status(201).json({mensaje : 'Lotes Articulo sucursal actualizado correctamente.' , id_lote_sucursal : updateLote});
    //     } catch (error) {
    //         console.error(error);
    //         res.status(500).json({ mensaje: "Error al actualizar Lotes Articulo sucursal." });
    //     }
    // }
    

  }

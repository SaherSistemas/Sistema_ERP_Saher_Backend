import type { Request, Response } from "express";
import { CajaService } from "../../services/Caja/Caja.service";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";

export class CajaController {

    static getAll = async (req: Request, res: Response) => {
        try {
            const cajas = await CajaService.getAll();
            res.status(200).json(cajas);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar todas las cajas." });
        }
    }

static getAllCajasSucursal = async (req: Request, res: Response) => {
  try {
    const { id_empre } = req.params; 
    const cajas = await CajaService.getAllCajasSucursal(String(id_empre));

     const empresa = await Empresa_Sucursal.findByPk(String(id_empre), {
          attributes: ["nom_empre"], 
        });
        const nombreEmpresa = empresa ? empresa.nom_empre : "Empresa desconocida";

    res.status(200).json({
     empresa: nombreEmpresa,
      cajas
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: "Error al encontrar las cajas de la sucursal." });
  }    
}

    static activarCaja = async (req: Request, res: Response) => {
        try {
            const { id_caja } = req.params;
            await CajaService.activarCaja(id_caja);
            res.status(200).json({ mensaje: "Caja activada correctamente." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al activar la caja." });
        }
    }
    static desactivarCaja = async (req: Request, res: Response) => {
        try {
            const { id_caja } = req.params;
            await CajaService.desactivarCaja(id_caja);
            res.status(200).json({ mensaje: "Caja desactivada correctamente." });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al desactivar la caja." });
        }
    }

    static getByID = async (req: Request, res: Response) => {
        try {
            const { id_caja } = req.params;
            const caja = await CajaService.getByIDFlexible(id_caja);
            res.status(200).json(caja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al encontrar la caja." });
        }
    }

    static getCantidadCajasPorSucursal = async (req: Request, res: Response) => {
        try {
            const { id_empre } = req.params;
            const cantidadCajas = await CajaService.getCantidadCajasPorSucursal(id_empre);
            res.status(200).json({ cantidad: cantidadCajas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al obtener la cantidad de cajas por sucursal." });
        }
    }


    static create = async (req: Request, res: Response) => {
        try {
            const data = req.body;
            const nuevaCaja = await CajaService.createCaja(data);
            res.status(201).json(nuevaCaja);
        } catch (error) {
            console.error(error);
            res.status(500).json({ mensaje: "Error al crear la caja." });
        }
    }


}
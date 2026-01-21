import { Request, Response } from "express";
import { Ubicacion_SucursalService } from "../services/Ubicacion_Sucursal.service";

export const Ubicacion_SucursalController = {

    // GET /ubicacion-sucursal
    getAll: async (req: Request, res: Response) => {
        //   console.log("Llegó a controller");
        try {
            const data = await Ubicacion_SucursalService.getAll();
            res.status(200).json(data);
        } catch (error: any) {
            res.status(500).json({
                message: "Error al obtener ubicaciones",
                error: error?.message || error
            });
        }
    },

    // GET /ubicacion-sucursal/:id
    getById: async (req: Request, res: Response) => {
        try {
            const { id } = req.params;

            const data = await Ubicacion_SucursalService.getById(id);
            res.status(200).json(data);

        } catch (error: any) {
            // tu service lanza "Ubicación no encontrada"
            if (String(error?.message).toLowerCase().includes("no encontrada")) {
                res.status(404).json({ message: error.message });
            }

            res.status(500).json({
                message: "Error al obtener la ubicación",
                error: error?.message || error
            });
        }
    },

    // GET /ubicacion-sucursal/sucursal/:id_sucursal
    getBySucursal: async (req: Request, res: Response) => {
        try {
            const { id_sucursal } = req.params;

            const data = await Ubicacion_SucursalService.getBySucursal(id_sucursal);
            res.status(200).json(data);

        } catch (error: any) {
            res.status(500).json({
                message: "Error al obtener ubicaciones por sucursal",
                error: error?.message || error
            });
        }
    },

    // POST /ubicacion-sucursal
    create: async (req: Request & { user?: any }, res: Response) => {
        try {
            
            const data = await Ubicacion_SucursalService.create(req.body);
           
            res.status(201).json(data);

        } catch (error: any) {
            console.log(error)
            const msg = String(error?.message || "");

            // Duplicado lógico (service)
            if (msg.toLowerCase().includes("ya existe")) {
                res.status(409).json({ message: msg });
            }
            res.status(500).json({
                message: "Error al crear la ubicación",
                error: error?.message || error
            });
        }
    }
};

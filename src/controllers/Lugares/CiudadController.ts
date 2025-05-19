import type { Request, Response } from "express";
import { CiudadService } from "../../services/Lugares/ciudad.service";
import { ICreateCiudad, IUpdateCiudad } from "../../interface/Lugares/Ciudades.interface";
export class CiudadController {
    static getAllCiudades = async (req: Request, res: Response) => {
        try {
            const todasCiudades = await CiudadService.getAllCiudad();
            res.status(201).json({ mensaje: todasCiudades })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos las ciudades." });
        }
    }
    static ciudadesActivas = async (req: Request, res: Response) => {
        try {
            const ciudadesActivas = await CiudadService.getCiudadesActivas()
            res.status(201).json(ciudadesActivas)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener las ciudades del estado." });
        }
    }
    static getCiudadById = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params;
            const ciudad = await CiudadService.getCiudadByID(id_ciuda)
            res.status(201).json(ciudad)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "No se encontro la ciudad." });
        }
    }

    static crearCiudad = async (req: Request<ICreateCiudad>, res: Response) => {
        try {
            const data = req.body
            const newCiudad = await CiudadService.createCiudad(data)
            res.status(201).json({ mensaje: "Ciudad creada correctamente.", ciudad: newCiudad });
        } catch (error) {
            //  console.error(error);
            res.status(500).json({ message: "Error al crear la ciudad." });
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params
            const data: IUpdateCiudad = req.body
            const updatedCiudad = await CiudadService.updateCiudad(id_ciuda, data)
            res.status(201).json({ mensaje: "Ciudad actualizada correctamente.", ciudad: updatedCiudad });
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar la ciudad." });
        }
    }

    static cambiarStatus = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params;
            const updatestatusCiudad = await CiudadService.cambiarStatus(id_ciuda)
            res.status(201).json({ mensaje: "Se cambió el estatus de la ciudad correctamente.", ciudad: updatestatusCiudad });
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error no se pudo cambiar el estatus de la ciudad." });
        }
    }


}
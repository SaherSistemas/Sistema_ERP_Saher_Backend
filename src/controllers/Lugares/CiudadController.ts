import type { Request, Response } from "express";
import Ciudad from "../../models/Ubicacion/Ciudad"
import { CiudadService } from "../../services/Lugares/ciudad.service";
import { ICreateCiudad, IUpdatedCiudad } from "../../interface/Lugares/Ciudades.interface";
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
    static getCiudadById = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params;
            const idCiudadNumber = parseInt(id_ciuda)
            const ciudad = await CiudadService.getCiudadByID(idCiudadNumber)
            res.status(201).json(ciudad)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "No se encontro la ciudad." });
        }
    }
    static ciudadesConEstado = async (req: Request, res: Response) => {
        try {
            const { id_esta_ciuda } = req.body;
            const ciudadesPorEstado = await CiudadService.getCiudadesPorEstado(id_esta_ciuda)
            res.status(201).json(ciudadesPorEstado)
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: "Error al obtener las ciudades del estado." });
        }
    }
    static crearCiudad = async (req: Request<ICreateCiudad>, res: Response) => {
        try {
            const data = req.body
            const newCiudad = await CiudadService.createCiudad(data)
            res.status(201).json('Ciudad creada correctamente.')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear la ciudad." });
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params
            const data: IUpdatedCiudad = req.body

            const IdNumber = parseInt(id_ciuda)
            const updatedCiudad = await CiudadService.updatedCiudad(IdNumber, data)

            const ciudad = await Ciudad.findByPk(id_ciuda);

            if (!ciudad) {
                res.status(404).json({ error: "No se encontro la ciudad." })
                return;
            }
            await ciudad.update(req.body);
            res.json('Ciudad actualizada correctamente.')
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al modificar la ciudad." });
        }
    }

    static cambiarStatus = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params;
            const ciudad = await Ciudad.findByPk(id_ciuda);
            if (!ciudad) {
                res.status(404).json({ error: 'Ciudad no encontrada.' });
                return;
            }
            const statusContrario = !ciudad.activo_ciuda;
            await ciudad.update({ activo_ciuda: statusContrario })

            res.status(201).json({ mensaje: "La ciudad se actualizo correctamente." })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error no se pudo cambiar el estatus de la ciudad." });
        }
    }


}
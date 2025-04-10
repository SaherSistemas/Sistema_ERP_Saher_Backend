import type { Request, Response } from "express";
import Ciudad from "../models/Ubicacion/Ciudad"
export class CiudadController {
    static getAllCiudades = async (req: Request, res: Response) => {
        try {
            const ciudades = await Ciudad.findAll();
            res.status(201).json({ mensaje: ciudades })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al obtener todos las ciudades." });
        }
    }
    static getCiudadById = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params;

            const ciudad = await Ciudad.findByPk(id_ciuda);

            if (!ciudad) {
                res.status(404).json({ error: "Ciudad no encontrada." })
                return;
            }
            res.json(ciudad)
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "No se encontro la ciudad." });
        }
    }

    static crearCiudad = async (req: Request, res: Response) => {
        try {
            const { id_esta_ciuda, nom_ciuda } = req.body;

            const ultimaCiudad = await Ciudad.findOne({
                order: [["id_ciuda", "DESC"]]
            });

            const SigId = ultimaCiudad ? ultimaCiudad.dataValues.id_ciuda + 1 : 1;

            const nuevaCiudad = await Ciudad.create({
                id_ciuda: SigId,
                id_esta_ciuda: id_esta_ciuda,
                nom_ciuda: nom_ciuda
            })

            res.status(201).json({
                mensaje: 'Ciudad creada correctamente', nuevaCiudad
            })
        } catch (error) {
            //console.error(error);
            res.status(500).json({ message: "Error al crear la ciudad." });
        }
    }

    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id_ciuda } = req.params

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
            res.status(500).json({ message: "Error no se pudo cambiar el estado de la ciudad." });
        }
    }
}
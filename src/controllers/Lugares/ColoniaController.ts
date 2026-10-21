import type { Request, Response } from 'express';
import { ColoniaService } from '../../services/Lugares/colonia.service';
import { ColoniaRepository } from '../../repository/Lugares/Colonia.respository';
import { ICreateColonia, IUpdateColonia } from '../../interface/Lugares/Colonia.interface';
import { IUpdateCiudad } from '../../interface/Lugares/Ciudades.interface';

export class ColoniaController {
  static getAllColonias = async (req: Request, res: Response) => {
    try {
      const todasColonias = await ColoniaService.getAllCiudad();
      res.status(200).json({ mensaje: todasColonias });
    } catch (error) {
      //    console.error(error)
      res.status(500).json({ message: 'Error al obtener las colonias' });
    }
  };
  static coloniasActivas = async (req: Request, res: Response) => {
    try {
      const coloniasPorCiudad = await ColoniaService.getColoniasActivas();
      res.status(200).json(coloniasPorCiudad);
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error al obtener las colonias de la ciudad.' });
    }
  };
  // GET /colonia/paginadas?page=1&limit=50&q=texto
  static getPaginadas = async (req: Request, res: Response) => {
    try {
      const page = Math.max(1, Math.floor(Number(req.query.page) || 1));
      const limit = Math.min(200, Math.max(10, Math.floor(Number(req.query.limit) || 50)));
      const q = typeof req.query.q === 'string' ? req.query.q : '';
      const { items, total } = await ColoniaRepository.getPaginadas(page, limit, q);
      res.status(200).json({ items, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
    } catch (error) {
      console.error('[Colonia.getPaginadas]', error);
      res.status(500).json({ message: 'Error al obtener las colonias' });
    }
  };

  // GET /colonia/porCP/:cp → colonias activas con ese código postal
  static getColoniasPorCP = async (req: Request, res: Response) => {
    try {
      const cp = String(req.params.cp ?? '').trim();
      if (!/^\d{4,5}$/.test(cp)) { res.status(400).json({ message: 'Código postal no válido.' }); return; }
      res.status(200).json(await ColoniaRepository.getColoniasPorCP(cp));
    } catch (error) {
      res.status(500).json({ message: 'Error al buscar por código postal.' });
    }
  };
  static getColoniasCiudad = async (req: Request, res: Response) => {
    try {
      const { id_ciuda_colonia } = req.params;
      const coloniasPorCiudad = await ColoniaService.getColoniasPorCiudad(id_ciuda_colonia);
      console.log(coloniasPorCiudad)
      res.status(200).json(coloniasPorCiudad);
    } catch (error) {
      //  console.error(error);
      res.status(500).json({ message: 'Error al obtener las colonias de la ciudad.' });
    }
  };

  static getColoniaById = async (req: Request, res: Response) => {
    try {
      const { id_colonia } = req.params;
      const colonia = await ColoniaService.getColoniaByID(id_colonia);
      res.status(200).json(colonia);
    } catch (error) {
      //console.error(error)
      res.status(500).json({ message: 'No se encontro la ciudad.' });
    }
  };

  static crearColonia = async (req: Request<ICreateColonia>, res: Response) => {
    try {
      const data = req.body;
      // console.log(data);
      const newColonia = await ColoniaService.createColonia(data);

      res.status(201).json({ mensaje: 'Colonia creada correctamente.', colonia: newColonia });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al crear la colonia.' });
    }
  };

  static updateByID = async (req: Request, res: Response) => {
    try {
      const { id_colonia } = req.params;
      const data: IUpdateColonia = req.body;
      const updatedColonia = await ColoniaService.updateColonia(id_colonia, data);
      res.status(201).json({ mensaje: 'Colonia actualizada correctamente', colonia: updatedColonia });
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error al modificar la colonia' });
    }
  };

  static cambiarStatus = async (req: Request, res: Response) => {
    try {
      const { id_colonia } = req.params;
      const updateStatusColonia = await ColoniaService.cambiarStatus(id_colonia);
      res
        .status(200)
        .json({ mensaje: 'Se cambio el estatus de la colonia correctamente', colonia: updateStatusColonia });
    } catch (error) {
      //console.error(error)
      res.status(500).json({ message: 'Error no se pudo cambiar el estatus de la colonia' });
    }
  };
}

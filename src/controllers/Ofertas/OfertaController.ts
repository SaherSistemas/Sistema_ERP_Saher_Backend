import type { Request, Response } from "express";
import { OfertaService } from "../../services/Ofertas/Ofertas.service";

export class OfertaController {
  static getOfertasAplicables = async (req, res) => {
    try {
      const {
        empresa: id_empre,
        fecha,
        canal = "PDV",
      } = req.query;
      if (!id_empre)
        return res.status(400).json({ error: "Faltan parámetros" });

      const dt = new Date(fecha ?? Date.now());
      const ofertas = await OfertaService.getOfertas({id_empre, fecha: dt });

      const filtradas = ofertas.filter((o) => !o.canal_oferta || o.canal_oferta === canal );

      return res.json(filtradas);
    } catch (e) {
      return res.status(500).json({ error: String(e) });
    }
  };

  static getAll = async (req: Request, res: Response) => {
    try {
      const oferta = await OfertaService.getAll();
      res.status(200).json(oferta);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar todas las ofertas." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const oferta = await OfertaService.getById(id);
      res.status(200).json(oferta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al encontrar Oferta." });
    }
  };

  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevaoferta = await OfertaService.createOferta(data);
      res.status(201).json(nuevaoferta);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear Nueva Oferta." });
    }
  };

  static update = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const data = req.body;
      const oferta_actualizada = await OfertaService.update(id, data);
      res.status(200).json(oferta_actualizada);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al actualizar Oferta." });
    }
  };
}

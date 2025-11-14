import type { Request, Response } from "express";
import { OfertaService } from "../../services/Ofertas/Ofertas.service";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";

export class OfertaController {

  static getOfertasAplicables = async (req: Request, res: Response) => {
  try {
    const { empresa: id_empre, fecha, canal = "PDV" } = req.query;

    if (!id_empre) {
      res.status(400).json({ error: "Faltan parámetros: empresa" });
    }

    const dt = fecha ? new Date(String(fecha)) : new Date();
    if (isNaN(dt.getTime())) {
      res.status(400).json({ error: "Fecha inválida" });
    }

    const canalStr = Array.isArray(canal) ? canal[0] : canal;

    const ofertas = await OfertaService.getOfertas({
      id_empre: String(id_empre),
      fecha: dt,
      canal: canalStr === "PDV" ? "PDV" : undefined,
    });

    const filtradas = ofertas.filter(
      (o: any) => !o.canal_oferta || o.canal_oferta === canalStr
    );

    const empresa = await Empresa_Sucursal.findByPk(String(id_empre), {
      attributes: ["nom_empre"], 
    });
    const nombreEmpresa = empresa ? empresa.nom_empre : "Empresa desconocida";

   res.json({
      ofertas_aplicables_para_empresa: nombreEmpresa,
      ofertas: filtradas,
    });
  } catch (e) {
    console.error("[getOfertasAplicables] Error:", e);
    res.status(500).json({ error: String(e) });
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

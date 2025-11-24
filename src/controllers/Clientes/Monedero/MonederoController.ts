import type { Request, Response } from "express";
import { MonederoService } from "../../../services/Clientes/Monedero/Monedero.service";

export class MonederoController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const monedero = await MonederoService.getAll();
      res.status(200).json(monedero);
    } catch (error) {
      console.error(error);
      res
        .status(500)
        .json({ mensaje: "Error al encontrar todos los monederos." });
    }
  };

  static getByID = async (req: Request, res: Response) => {
    try {
      const { telefono } = req.params;
      const monedero = await MonederoService.getByTelefono(telefono);

      if (!monedero) {
        res.status(404).json({
          mensaje: "Monedero no encontrado"
        });
      }

      res.status(200).json(monedero);

    } catch (error) {
      console.error("Error en getByID:", error);
      res.status(500).json({
        mensaje: "Error al obtener monedero"
      });
    }
  };


  static create = async (req: Request, res: Response) => {
    try {
      const data = req.body;
      const nuevoMonedero = await MonederoService.createMonedero(data);
      res.status(201).json(nuevoMonedero);
    } catch (error) {
      console.error(error);
      res.status(500).json({ mensaje: "Error al crear el monedero." });
    }
  };

  static deleteMonedero = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const resultado = await MonederoService.deleteMonedero(id);
      res.status(200).json({
        success: true,
        message: resultado.message,
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message || "Error eliminando el monedero",
      });
    }
  };

  static acumularSaldo = async (req: Request, res: Response) => {
    try {
      const telefono = req.params.telefono_cliente;
      const { saldo } = req.body;

      if (!telefono) {
        res.status(400).json({ message: "Falta Telefono" });
      }

      const resultado = await MonederoService.acumularSaldoporTelefono(telefono, saldo);
      res.json({ message: "Saldo acumulado correctamente", data: resultado });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  };
}

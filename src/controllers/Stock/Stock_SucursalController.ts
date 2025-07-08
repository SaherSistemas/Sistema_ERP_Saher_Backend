import type { Request, Response } from "express";
import { StockSucursalService } from "../../services/Stock/Stock_Sucursal.service"; 
import Articulo from "../../models/Articulos/Articulo";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Stock_sucursal from "../../models/Stock/Stock_Sucursal";
import { restore } from "pdfkit";


export class StockSucursalController {
  static getAll = async (req: Request, res: Response) => {
    try {
      const stock = await StockSucursalService.getAll();

      res.status(200).json({
        success: true,
        message: 'Lista de stock obtenida correctamente',
        data: stock,
      });
    } catch (error) {
      console.error('Error en StockSucursalController.getAll:', error);

      res.status(500).json({
        success: false,
        message: 'Error al obtener el stock de sucursal',
      });
    }
  }

  static getAllsucursalesPorIdArticulo = async(req: Request, res: Response) => {
    try {
        const {id_artic} = req.params;
        const stockensucursal = await StockSucursalService.getAllsucursalesPorIdArticulo(id_artic);
        res.status(200).json(stockensucursal);
    } catch (error) {
        console.error('Error en StockSucursalController.getAllsucursalesPorIdArticulo:', error);

        res.status(500).json({
        message: 'Error al obtener el stock por sucursal',
      });
        
    }
  }

  static getAllArticulosporSucursal = async(req: Request, res: Response) => {
    try {
        const {id_empre} = req.params;
        const stockensucursal = await StockSucursalService.getAllArticulosporSucursal(id_empre);
        res.status(200).json(stockensucursal);
    } catch (error) {
        console.error('Error en StockSucursalController.getAllArticulosporSucursal:', error);

        res.status(500).json({
        message: 'Error al obtener el stock por sucursal',
      });
        
    }
  }

  static create = async (req: Request, res: Response) =>{
    try {
        const data = req.body;
        const nuevoStock = await StockSucursalService.create(data);
        res.status(201).json(nuevoStock);

    } catch (error) {
         console.error(error);
         res.status(500).json({ mensaje: "Error al crear el stock." });    
    }
  }

};

import type { Request, Response } from "express";
import { Cat_Regimen_FiscalService } from "../services/Cat_Regimen_Fiscal.service";
import { ICat_Regimen_Fiscal, IUpdateCat_Regimen_Fiscal } from "../interface/Cat_Regimen_Fiscal.interface";

export class Cat_Regimen_FiscalController {
    static getAll = async (req: Request, res: Response) => {
        try {
            const todosRegimenes = await Cat_Regimen_FiscalService.getAllCat_Regimen_Fiscal();
            res.status(201).json({ mensaje: todosRegimenes })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ mensaje: "Error al obtener los regimenes" })
        }
    }

    static create = async (req: Request<ICat_Regimen_Fiscal>, res: Response) => {
        try {
            const data = req.body
            const newRegimen = await Cat_Regimen_FiscalService.createRegimenFiscal(data)
            res.status(201).json({ mensaje: "Regimen creado correctamente." })
        } catch (error) {
            //console.error(error)
            res.status(500).json({ mensaje: "Error al crear el Regimen Fiscal." })
        }
    }

    static getById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params

            const regimenFiscal = await Cat_Regimen_FiscalService.getRegimenFiscalByID(id)
            res.status(201).json(regimenFiscal)
        } catch (error) {
            console.error(error)
            res.status(500).json({ mensaje: "Error al obtener el Regimen Fiscal." })
        }
    }
    static updateByID = async (req: Request, res: Response) => {
        try {
            const { id } = req.params
            const data: IUpdateCat_Regimen_Fiscal = req.body

            const updateRegimen = await Cat_Regimen_FiscalService.updateRegimenFiscal(id, data)
            res.status(201).json({ mensaje: "Regimen Fiscal actualizado correctamente." })
        } catch (error) {
            //console.log(error)
            res.status(500).json({ mensaje: "Error al modificar el regimen fiscal." })
        }
    }
}
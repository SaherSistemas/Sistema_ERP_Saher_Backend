import type { Request, Response } from 'express';
import { EmpleadoService } from '../services/Empleados.service';
import { EmpleadoRepository } from '../repositories/Empleado.repository';
import { ICrearEmpleado, IEmpleado, IUpdateEmpleado } from '../interface/Empleado.interface';

export class EmpleadoController {
  static getAllEmpleados = async (req: Request, res: Response) => {
    try {
      //console.error(error);
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const query = (req.query.query as string) || '';
      const empleados = await EmpleadoService.getAllEmpleados(page, limit, query);
      //console.log(empleados)
      res.status(201).json(empleados);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener todos los empleados' });
    }
  };
  static getAllEmpleadoPuedeSerAgente = async (req: Request, res: Response) => {
    try {
      const empleados = await EmpleadoService.getAllEmpleadosQuePuedenSerAgente();
      res.status(201).json(empleados);
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al obtener todos los empleados' });
    }
  };
  static createEmpleado = async (req: Request<ICrearEmpleado>, res: Response) => {
    try {
      const data = req.body;

      const nuevoEmpleado = await EmpleadoService.createEmpleado(data);
      res.status(201).json({ mensaje: 'Empleado creado correctamente.', empleado: nuevoEmpleado });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al crear el empleados' });
    }
  };
  static getEmpleadoByID = async (req: Request, res: Response) => {
    try {
      const { id_empleado } = req.params;
      const empleado = await EmpleadoService.getEmpledoById(id_empleado);
      res.status(201).json(empleado);
    } catch (error) {
      res.status(500).json({ message: 'No se encontro el empleado' });
    }
  };
  static updateEmpleado = async (req: Request, res: Response) => {
    try {
      const { id_empleado } = req.params;
      const data: IUpdateEmpleado = req.body;
      const updateEmpleado = await EmpleadoService.updateEmpleado(id_empleado, data);
      res.status(201).json({ mensaje: 'Empleado actualizado correctamente', empleado: updateEmpleado });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Error al actualizar el empleado ' });
    }
  };
  /*static cambiarStatus = async (req: Request, res: Response) => {
    try {
      const { id_empleado } = req.params;
      const updateStatusEmpleado = await EmpleadoService.cambiarStatus(id_empleado);
      res.status(201).json({ mesaje: 'Se cambio el estatus del empleado', empleado: updateStatusEmpleado });
    } catch (error) {
      //console.error(error);
      res.status(500).json({ message: 'Error no se pudo cambiar el estatus del empleado.' });
    }
  };*/

  static getAllSinUsuario = async (req: Request, res: Response) => {
    try {
      const empleados = await EmpleadoRepository.sinUsuario();
      res.status(200).json(empleados);
    } catch (error) {
      console.log(error);
      res.status(500).json({ message: 'Error al obtener empleados sin usuario' });
    }
  };
}

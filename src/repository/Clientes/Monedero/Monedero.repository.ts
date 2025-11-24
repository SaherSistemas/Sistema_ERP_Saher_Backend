import MonederoCliente from "../../../models/Clientes/Monedero/Monedero";
import {
  ICreateOrUpdateMonedero,
} from "../../../interface/Clientes/Monedero/Modenero.interface";
import { v4 as uuidv4 } from "uuid";
import { Op, Transaction, literal } from "sequelize";
import { isUUID } from "../../../utils/validaciones";
import Cliente from "../../../models/Clientes/Cliente";

export const MonederoRepository = {
  getAll: async () => {
    return await MonederoCliente.findAll();
  },

  getByCliente: async (id_cliente: string) => {
    return await MonederoCliente.findOne({ where: { id_cliente } });
  },

  getByTelefono: async (telefono: string) => {
    if (!telefono || telefono.trim() === "") {
      return null;
    }
    const cliente = await Cliente.findOne({
      where: { telefono_cliente: telefono },
      attributes: ["id_cliente", "nombre_cliente", "telefono_cliente"],
    });

    if (!cliente) {
      return null;
    }

    const monedero = await MonederoCliente.findOne({
      where: { id_cliente: cliente.id_cliente }
    });

    return {
      cliente,
      monedero
    };
  },


  createMonedero: async (
    data: ICreateOrUpdateMonedero,
    options?: { transaction?: Transaction }
  ) => {

    if (!data.fecha_creacion || !data.fecha_expiro) {
      throw new Error("Fechas incompletas para crear el monedero.");
    }

    return await MonederoCliente.create(
      {
        id_monedero: uuidv4(),
        saldo_monedero: 0,
        id_cliente: data.id_cliente.trim(),
        fecha_creacion: new Date(data.fecha_creacion),
        fecha_expiro: new Date(data.fecha_expiro),
      },
      {
        transaction: options?.transaction
      }
    );
  },


  deleteMonedero: async (id_monedero: string) => {
    if (!isUUID(id_monedero)) {
      throw new Error("El id_monedero proporcionado no es válido");
    }

    const monedero = await MonederoCliente.findByPk(id_monedero);
    if (!monedero) {
      throw new Error(`No existe un monedero con id: ${id_monedero}`);
    }

    await MonederoCliente.destroy({ where: { id_monedero } });

    return {
      message: `Monedero con id ${id_monedero} eliminado correctamente.`,
    };
  },

  acumularSaldo: async (monedero: MonederoCliente, saldo: number) => {
    monedero.saldo_monedero += saldo;
    await monedero.save();
    return {
      message: `Saldo acumulado correctamente.`,
      nuevo_saldo: monedero.saldo_monedero,
      nombre_cliente: monedero.id_cliente,
    };
  },
};

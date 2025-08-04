import { promises } from "dns";
import {
  IMonedero,
  ICreateOrUpdateMonedero,
} from "../../../interface/Clientes/Monedero/Modenero.interface";
import { MonederoRepository } from "../../../repository/Clientes/Monedero/Monedero.repository";
import MonederoCliente from "../../../models/Clientes/Monedero/Monedero";
import PDFDocument from "pdfkit";
import fs from "fs";
import dayjs from "dayjs";
import Cliente from "../../../models/Clientes/Cliente";

export const MonederoService = {
  getAll: async () => {
    return await MonederoRepository.getAll();
  },

  getByIDFlexible: async (identificador_cliente: string) => {
    return await MonederoRepository.getByIDFlexible(identificador_cliente);
  },

  createMonedero: async (data: ICreateOrUpdateMonedero) => {
    const monederoExistente = await MonederoRepository.getByCliente(
      data.id_cliente.trim()
    );
    if (monederoExistente) {
      throw new Error("Ya existe un monedero para este cliente");
    }
    return await MonederoRepository.createMonedero(data);
  },

  deleteMonedero: async (id_monedero: string) => {
    return await MonederoRepository.deleteMonedero(id_monedero);
  },

  acumularSaldoporTelefono: async (telefono: string, saldo: number) => {
    if (typeof saldo !== "number" || saldo <= 0) {
      throw new Error("Monto invalido");
    }
    const cliente = await Cliente.findOne({
      where: { telefono_cliente: telefono },
      attributes:["id_cliente","nombre_cliente"],
    });
    if (!cliente) {
      throw new Error("Cliente no encontrado");
    }
    const monedero = await MonederoCliente.findOne({
      where: {id_cliente: cliente.id_cliente},
    })

    if (!monedero) {
      throw new Error("Monedero del cliente no encontrado");
    }
    const resultado = await MonederoRepository.acumularSaldo(monedero, saldo);

    return {
      nombre_cliente: cliente.nombre_cliente,
      nuevo_saldo: resultado.nuevo_saldo,
    };

  },
};

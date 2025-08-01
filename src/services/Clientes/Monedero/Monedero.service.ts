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
  acumularSaldo: async (telefono_cliente: string, monto: number) => {
    return await MonederoRepository.acumularSaldo(
      telefono_cliente.trim(),
      monto
    );
  },
};

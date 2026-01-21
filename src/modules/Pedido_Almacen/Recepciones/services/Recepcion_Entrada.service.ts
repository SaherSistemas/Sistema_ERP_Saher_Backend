import { v4 as uuidv4 } from "uuid";
import { ICreateRecepcionEntradaDTO, IListRecepcionesQuery } from "../interface/Recepcion_Entrada.interface";
import { Recepcion_EntradaRepository } from "../repositories/Recepcion_Entrada.repository";

function base64PngToBuffer(dataUrl: string): Buffer {
    const m = dataUrl?.match(/^data:image\/png;base64,(.+)$/);
    if (!m) throw new Error("Firma inválida. Se esperaba PNG base64 (data:image/png;base64,...)");
    return Buffer.from(m[1], "base64");
}

export const Recepcion_EntradaService = {
    create: async (dto: ICreateRecepcionEntradaDTO, id_empleado_recibe: string) => {
        const entidad = (dto.entidad_recibo ?? "").trim();
        const nombreEntrega = (dto.nombre_persona_entrega ?? "").trim();
        const tipo = dto.tipo_entidad;

        const cajas = Number(dto.cantidad_cajas ?? 0);
        const bolsas = Number(dto.cantidad_bolsas ?? 0);
        const tarimas = Number(dto.cantidad_tarimas ?? 0);

        if (!entidad) throw new Error("entidad_recibo es requerido");
        if (!tipo) throw new Error("tipo_entidad es requerido");
        if (!nombreEntrega) throw new Error("nombre_persona_entrega es requerido");
        if (!dto.firma) throw new Error("Firma requerida");

        if (cajas <= 0 && bolsas <= 0 && tarimas <= 0) {
            throw new Error("Debes capturar al menos una cantidad (cajas/bolsas/tarimas)");
        }

        const firma_png = base64PngToBuffer(dto.firma);

        const id_recepcion = uuidv4();

        const creado = await Recepcion_EntradaRepository.create({
            id_recepcion,
            entidad_recibo: entidad,
            tipo_entidad: tipo,
            nombre_persona_entrega: nombreEntrega,
            cantidad_cajas: cajas,
            cantidad_bolsas: bolsas,
            cantidad_tarimas: tarimas,
            observaciones: dto.observaciones?.trim() || null,
            firma_png,
            firma_mime: "image/png",
            id_empleado_recibe,
            fecha_recepcion: new Date(),
        });

        return creado;
    },

    getById: async (id_recepcion: string) => {
        const rec = await Recepcion_EntradaRepository.findById(id_recepcion, false);
        if (!rec) throw new Error("Recepción no encontrada");
        return {
            ...rec.toJSON(),
            firma_url: `/almacen/recepciones/${id_recepcion}/firma`,
        };
    },

    getFirma: async (id_recepcion: string) => {
        const rec = await Recepcion_EntradaRepository.findById(id_recepcion, true);
        if (!rec) throw new Error("Recepción no encontrada");
        return { firma_png: rec.firma_png, firma_mime: rec.firma_mime || "image/png" };
    },

    list: async (query: IListRecepcionesQuery) => {
        return await Recepcion_EntradaRepository.list(query);
    },
};

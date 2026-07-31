import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { ICreateRecepcionEntradaDTO, IListRecepcionesQuery } from "../interface/Recepcion_Entrada.interface";
import { Recepcion_EntradaRepository } from "../repositories/Recepcion_Entrada.repository";

const FIRMAS_DIR = path.join(__dirname, "../../../../../uploads/recepciones");

function guardarFirmaEnDisco(dataUrl: string, id_recepcion: string): string {
    const m = dataUrl?.match(/^data:image\/png;base64,(.+)$/);
    if (!m) throw new Error("Firma inválida. Se esperaba PNG base64.");
    if (!fs.existsSync(FIRMAS_DIR)) fs.mkdirSync(FIRMAS_DIR, { recursive: true });
    const filename = `${id_recepcion}.png`;
    fs.writeFileSync(path.join(FIRMAS_DIR, filename), Buffer.from(m[1], "base64"));
    return `/uploads/recepciones/${filename}`;
}

export const Recepcion_EntradaService = {
    create: async (dto: ICreateRecepcionEntradaDTO, id_empleado_recibe: string, id_empresa: string) => {
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
        if (cajas <= 0 && bolsas <= 0 && tarimas <= 0) throw new Error("Debes capturar al menos una cantidad");

        const id_recepcion = uuidv4();
        const firma_url = guardarFirmaEnDisco(dto.firma, id_recepcion);

        const creado = await Recepcion_EntradaRepository.create({
            id_recepcion,
            id_empresa,
            entidad_recibo: entidad,
            tipo_entidad: tipo,
            nombre_persona_entrega: nombreEntrega,
            cantidad_cajas: cajas,
            cantidad_bolsas: bolsas,
            cantidad_tarimas: tarimas,
            observaciones: dto.observaciones?.trim() || null,
            firma_url,
            id_empleado_recibe,
            fecha_recepcion: new Date(),
        });

        return creado;
    },

    getById: async (id_recepcion: string) => {
        const rec = await Recepcion_EntradaRepository.findById(id_recepcion);
        if (!rec) throw new Error("Recepción no encontrada");
        return rec.toJSON();
    },

    list: async (query: IListRecepcionesQuery, id_empresa: string) => {
        return await Recepcion_EntradaRepository.list(query, id_empresa);
    },
};

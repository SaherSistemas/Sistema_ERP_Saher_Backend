import { v4 as uuidv4 } from 'uuid';
import { Op, Sequelize, Transaction } from 'sequelize';

import { dbLocal } from '../../../../config/db';

import { guardarFirma } from '../../../../helpers/guardarFirma';
import { Entrega_Pedido_Firma } from '../model/Entrega_Pedido_Firma';



export const Entrega_Pedido_FirmaRepository = {


    agregarFirma: async (dto: {
        id_entrega: string;
        tipo_firma: 'RECIBE' | 'ENTREGA' | 'EVIDENCIA';
        nombre_persona: string;
        puesto_o_relacion: string;
        firma_base64: string;
    }, t?: Transaction) => {
        return await dbLocal.transaction(async (t: Transaction) => {
            const firma_url = guardarFirma(dto.firma_base64, dto.id_entrega);

            return await Entrega_Pedido_Firma.create({
                id_entrega: dto.id_entrega,
                tipo_firma: dto.tipo_firma,
                nombre_persona: dto.nombre_persona,
                puesto_o_relacion: dto.puesto_o_relacion,
                firma_url,
                fecha_firma: new Date(),
            }, { transaction: t });
        });

    }
}
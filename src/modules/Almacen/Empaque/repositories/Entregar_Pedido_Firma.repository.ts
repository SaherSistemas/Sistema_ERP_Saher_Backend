import { Transaction } from 'sequelize';
import { dbLocal } from '../../../../config/db';
import { guardarFirma } from '../../../../helpers/guardarFirma';
import { Entrega_Pedido_Firma } from '../model/Entrega_Pedido_Firma';
import { Entrega_Pedido } from '../model/Entrega_Pedido';


export const Entrega_Pedido_FirmaRepository = {

    /**
     * Agrega una firma a una entrega.
     *
     * Cuando tipo_firma = 'RECIBE' (el cliente firma ante el agente)
     * y la entrega está en estado 'ABIERTA' (flujo ALMACEN → AGENTE),
     * la entrega se cierra automáticamente → estado = 'ENTREGADA'.
     */
    agregarFirma: async (dto: {
        id_entrega: string;
        tipo_firma: 'RECIBE' | 'ENTREGA' | 'EVIDENCIA';
        nombre_persona: string;
        puesto_o_relacion: string;
        firma_base64: string;
    }, externalTx?: Transaction) => {

        const execute = async (t: Transaction) => {
            // 1. Guardar imagen de firma en disco ──────────────────────────
            const firma_url = guardarFirma(dto.firma_base64, dto.id_entrega);

            // 2. Crear registro de firma ────────────────────────────────────
            const firma = await Entrega_Pedido_Firma.create({
                id_entrega:        dto.id_entrega,
                tipo_firma:        dto.tipo_firma,
                nombre_persona:    dto.nombre_persona,
                puesto_o_relacion: dto.puesto_o_relacion,
                firma_url,
                fecha_firma: new Date(),
            }, { transaction: t });

            // 3. Si el CLIENTE firma (tipo 'RECIBE') y la entrega está abierta
            //    → cerrar la entrega (flujo ALMACEN → AGENTE → CLIENTE completado)
            if (dto.tipo_firma === 'RECIBE') {
                const entrega = await Entrega_Pedido.findByPk(dto.id_entrega, { transaction: t });

                if (entrega && entrega.estado === 'ABIERTA') {
                    await entrega.update(
                        { estado: 'ENTREGADA', fecha_firma: new Date() },
                        { transaction: t }
                    );
                }
            }

            return firma;
        };

        return externalTx ? execute(externalTx) : dbLocal.transaction(execute);
    },
};

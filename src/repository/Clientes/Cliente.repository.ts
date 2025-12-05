import { UUID } from "crypto";
import Cliente from "../../models/Clientes/Cliente";
import { isUUID } from "../../utils/validaciones";
import { ICliente, ICreateUpdateCliente } from "../../interface/Clientes/Cliente.interface";
import { v4 as uuidv4 } from "uuid";
import { Op, Transaction, literal } from "sequelize";
import Tipo_Cliente from "../../models/Clientes/Tipo_Cliente";
import Beneficio_Cliente from "../../models/Clientes/Beneficio_Cliente";
import Monedero from "../../models/Clientes/Monedero/Monedero";
export const ClienteRepository = {

    getAll: async () => {
        return await Cliente.findAll();
    },

    getByIDFlexible: async (identificador_cliente: string) => {
        if (isUUID(identificador_cliente)) {
            return await Cliente.findByPk(identificador_cliente)
        } else {

            return await Cliente.findAll({
                where: {
                    [Op.or]: [
                        { telefono_cliente: identificador_cliente },
                        { nombre_cliente: { [Op.iLike]: `%${identificador_cliente}%` } },
                        { apellido_pat_cliente: { [Op.iLike]: `%${identificador_cliente}%` } },
                        { apellido_mat_cliente: { [Op.iLike]: `%${identificador_cliente}%` } }
                    ]
                }
            });
        }
    },

    getDatosBeneficiado: async (telefono_cliente: string) => {
        return await Cliente.findOne({
            where: { telefono_cliente },
            attributes: [
                "id_cliente",
                "nombre_cliente",
                "apellido_pat_cliente",
                "apellido_mat_cliente",
                "telefono_cliente",],
            include: [{
                model: Tipo_Cliente,
                as: "tipo_cliente",
                attributes: ["nom_tipo_cliente"],
                include: [{
                    model: Beneficio_Cliente,
                    as: "beneficio",
                    attributes: ["porcentaje_beneficio"],
                }
                ]
            },
            {
                model: Monedero,
                as: "monedero",
                attributes: ["saldo_monedero", "fecha_expiro"]
            }
            ]

        });

    },

    createCliente: async (
        data: ICliente,
        options?: { transaction?: Transaction }
    ) => {
        return await Cliente.create({
            id_cliente: uuidv4(),
            ...data
        }, options);
    },
    updateCliente: async (id_cliente: string, data: ICreateUpdateCliente) => {
        return await Cliente.update(data, {
            where: { id_cliente }
        });
    },

}
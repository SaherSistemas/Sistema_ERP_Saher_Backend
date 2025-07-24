import { v4 as uuidv4 } from 'uuid';

import Detalle_Compra_Solicitado from "../../models/Compra/Detalle_Compra_Solicitado";
import Articulo from '../../models/Articulos/Articulo';
import Compra_Proveedor from '../../models/Compra/Compra_Proveedor';
import Proveedor from '../../models/Proveedor/Proveedor';
import { ICreateCompra_Proveedor } from '../../interface/Compras/Compra_Proveedor.interface';
import Compra_General from '../../models/Compra/Compra_General';
import Factura_Compra_Proveedor from '../../models/Proveedor/Factura_Compra_Proveedor';
import { Factura_Compra_ProveedorRepository } from '../Proveedor/Factura_Compra_Proveedor.repository';
import { EmpleadoRepository } from '../Usuarios/Empleado.repository';
import { Sequelize } from 'sequelize-typescript';

export const Compra_ProveedorRepository = {

    /*
           Código	      Estado	                             Descripción
           C	        CAPTURANDO	                             La compra está en proceso, aún sin finalizar.
           A            CAPTURADA                                La captura ha sido completada pero aun no se ha enviado al proveedor.
           E	        ENVIADA	                                 La orden ha sido enviada al proveedor.
           L            CAPTURANDO LOTES                         La compra se estan capturando los lotes.
           K            LOTES REGISTRADOS	                     Los lotes han sido registrados y se está esperando la recepción de los productos.
           R	        RECIBIDA	                             Todos los productos han sido recibidos correctamente.(ESPERANDO CHEQUEO Y CONTEO)
           F	        COMPLETADA	                             Fue recibido y se cerró la compra.
           D            COMPLETADA PERO CON DEVOLUCION           La compra fue completada pero tiene devolucion.    
    */
    /*
     * ************************************************************
     * ************************COMPRA_PROVEEDOR*******************
     * ***********************************************************
     */

    getAllCompra_ProveedorPorIdCompGener: async (id_compra_general: string) => {
        return await Compra_Proveedor.findAll({
            where: { id_compra_general: id_compra_general },
            include: [
                {
                    model: Proveedor
                }
            ]
        });
    },

    getAllCompras_ProveedorParaRecibir: async (id_empresa_sucursal: string) => {
        const comprasGenerales = await Compra_General.findAll({
            where: { id_empresa_sucursal }
        });

        return await Compra_Proveedor.findAll({
            include: [Proveedor],
            where: {
                id_compra_general: comprasGenerales.map(compra => compra.id_compra_general)
            },
            order: [
                [Sequelize.literal('fecha_mercancia_recibida_proveedor IS NOT NULL'), 'ASC'], // NULL primero
                ['fecha_mercancia_recibida_proveedor', 'ASC'] // Luego fechas en orden ascendente
            ]
        });
    },

    marcarCompraProveedorComoRecibida: async (id_comp: string) => {
        const compraProveedor = await Compra_Proveedor.findByPk(id_comp);

        if (!compraProveedor) {
            throw new Error('Compra del proveedor no encontrada');
        }

        let seActualizoCompra = false;

        // Si aún no ha sido marcada como recibida, actualízala
        if (compraProveedor.fecha_mercancia_recibida_proveedor == null) {
            await compraProveedor.update({
                fecha_mercancia_recibida_proveedor: new Date(),
                estado_comp: 'R'
            });
            seActualizoCompra = true;
        }

        // Buscar proveedor
        const proveedor = await Proveedor.findByPk(compraProveedor.idprove_comp);
        if (!proveedor) {
            throw new Error('Proveedor no encontrado');
        }

        // Funciones auxiliares
        const intervalToMinutes = (interval: string): number => {
            const match = interval.match(/(\d+)\s*days?\s*(\d+)?\s*hours?/);
            if (!match) return 0;
            const days = parseInt(match[1] || '0');
            const hours = parseInt(match[2] || '0');
            return days * 24 * 60 + hours * 60;
        };

        const minutesToIntervalString = (minutes: number): string => {
            const days = Math.floor(minutes / 1440);
            const hours = Math.floor((minutes % 1440) / 60);
            return `${days} dias ${hours} horas`;
        };

        // Calcular promedio actualizado
        const plazoEntrega = intervalToMinutes(proveedor.plazoentrega_prove);
        const entregasPrevias = proveedor.num_entregas_prove || 0;

        const nuevoPlazoCompraMin = Math.floor(
            (new Date().getTime() - new Date(compraProveedor.fecha_enviada_proveedor).getTime()) / 60000
        );

        const nuevoPromedioMin = Math.round(
            (plazoEntrega * entregasPrevias + nuevoPlazoCompraMin) / (entregasPrevias + 1)
        );

        const nuevoIntervalo = minutesToIntervalString(nuevoPromedioMin);

        await proveedor.update({
            plazoentrega_prove: nuevoIntervalo,
            num_entregas_prove: entregasPrevias + 1
        });

        return {
            actualizado: seActualizoCompra,
            nuevoPromedio: nuevoIntervalo
        };
    },



    findCompraProveedor_CapturandoByProveedor: async (id_proveedor: string, id_empresa: string) => {
        return await Compra_Proveedor.findOne({
            where: {
                idprove_comp: id_proveedor,
                estado_comp: 'C' // o el que uses para 'Capturando'
            },
            include: [
                {
                    model: Compra_General,
                    where: {
                        id_empresa_sucursal: id_empresa
                    }
                }
            ]
        });
    },
    cambiarTotalFactura: async (id_comp: string, totalFactura: number) => {
        const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp)
        const facturaProveedor = await Factura_Compra_ProveedorRepository.getByID(id_comp)

        await facturaProveedor.update({
            total_factura_proveedor: totalFactura
        })

        return await compraProveedor.update({
            total_comp_factura: totalFactura
        })




    },
    getAllArticulosPorCompra: async (id_comp: string) => {
        return await Detalle_Compra_Solicitado.findAll({
            where: { idcompr_detcompsol: id_comp },
            include: [
                {
                    model: Articulo
                },
                {
                    model: Compra_Proveedor
                }
            ]
        });
    },
    getByID: async (id_comp: string) => {
        const compraProveedor = await Compra_Proveedor.findByPk(id_comp)
        return compraProveedor
    },
    addDetallesCompraSolicitado: async (id_compra: string, detalles: any[]) => {
        const detallesProcesados = await Promise.all(
            detalles.map(async (detalle) => {
                const existente = await Detalle_Compra_Solicitado.findOne({
                    where: {
                        idcompr_detcompsol: id_compra,
                        idarticulo_detcompsol: detalle.idarticulo_detcompsol,
                        precio_detcompsol: detalle.precio_detcompsol
                    }
                });

                if (existente) {
                    // Acumular la cantidad si ya existe
                    existente.cantidad_detcompsol += detalle.cantidad_detcompsol;
                    await existente.save();
                    return existente;
                } else {
                    // Crear nuevo si no existe
                    return await Detalle_Compra_Solicitado.create({
                        id_detcompsol: uuidv4(),
                        idcompr_detcompsol: id_compra,
                        ...detalle
                    });
                }
            })
        );

        return detallesProcesados;
    },

    actualizarFechaEnviadaProveedor: async (id_comp: string) => {
        const compraProveedor = await Compra_Proveedor.findByPk(id_comp);

        if (!compraProveedor) {
            throw new Error('Compra del proveedor no encontrada');
        }

        if (compraProveedor.fecha_enviada_proveedor == null) {
            return await compraProveedor.update({
                fecha_enviada_proveedor: new Date(),
                estado_comp: 'E'
            });
        }

        // Si ya tenía fecha, simplemente retorna el objeto sin modificar
        return compraProveedor;
    },
    guardarFacturaEIniciarCapturaLotes: async (id_comp: string, folio_factura_compra: string) => {
        const compra = await Compra_ProveedorRepository.getByID(id_comp)
        compra.update({
            folio_factura_compra: folio_factura_compra,
            inicio_de_registro_lotes: new Date(),
            estado_comp: 'L'
        })
    },

    actualizarEstadoAlGuardarLotes: async (id_comp: string, id_empleado_registro_lotes: string) => {
        const compraProveedor = await Compra_ProveedorRepository.getByID(id_comp)
        const empleado = await EmpleadoRepository.getByIdFlexible(id_empleado_registro_lotes);
        compraProveedor.update({
            fin_de_registro_lotes: new Date(),
            estado_comp: 'K',
            id_empleado_registro_lotes: empleado.id_empleado
        })
    },

    createCompraProveedor: async (data: ICreateCompra_Proveedor) => {
        const { idprove_comp, id_compra_general } = data
        return await Compra_Proveedor.create({
            id_comp: uuidv4(),
            estado_comp: 'C',
            idprove_comp: idprove_comp,
            id_compra_general: id_compra_general,
            inicio_de_compra_proveedor: new Date(),
        })
    },
    articulosDetalleCompraProveedor: async (id_comp: string) => {
        const compraProveedor = await Compra_Proveedor.findOne({
            where: { id_comp },
            attributes: ['id_comp'],
            include: [
                {
                    model: Detalle_Compra_Solicitado,
                    attributes: ['cantidad_detcompsol', 'precio_detcompsol'],
                    include: [
                        {
                            model: Articulo,
                            attributes: ['cod_int_artic', 'cod_barr_artic', 'des_artic'],
                        }
                    ],
                    required: false // evita LEFT JOIN innecesarios si no hay productos
                },
                {
                    model: Proveedor,
                    attributes: ['nomcort_prove', 'razsoc_prove', 'rfc_prove', 'telef_prove', 'corr_prove'],
                    required: false
                }
            ],
        });

        return compraProveedor.get({ plain: true })
    },


    actualizarArticuloGuardadoUltimo: async (id_compra_general: string, id_artic: string) => {

        const compraGeneral = await Compra_General.findByPk(id_compra_general)

        return await compraGeneral.update({
            ultimo_articulo_guardado: id_artic
        })
    },

}
import { dbLocal } from '../../../config/db';
import { RetoRepository } from '../repository/Reto.repository';
import Reto from '../model/Reto';

interface DetalleVentaInput {
    id_artic: string;
    id_categoria?: string;
    cantidad: number;
    precio_unitario: number;
}

interface ActualizarProgresoInput {
    id_empleado: string;
    id_empresa: string;
    id_corte: string;
    fecha_dia: string;           // YYYY-MM-DD
    total_venta: number;
    num_ventas_incremento: number; // siempre 1 por venta
    detalles: DetalleVentaInput[];
}

export const RetoService = {

    getAll: (id_empresa: string) => RetoRepository.getAllPorEmpresa(id_empresa),

    create: (data: any) => RetoRepository.create(data),

    update: (id_reto: string, data: any) => RetoRepository.update(id_reto, data),

    toggleActivo: (id_reto: string) => RetoRepository.toggleActivo(id_reto),

    delete: (id_reto: string) => RetoRepository.delete(id_reto),

    getMisRetos: (id_empleado: string, id_empresa: string, id_corte: string, fecha_dia: string) =>
        RetoRepository.getRetosConProgreso(id_empleado, id_empresa, id_corte, fecha_dia),

    getPuntosTotales: (id_empleado: string) => RetoRepository.getPuntosTotales(id_empleado),

    getHistorialLogros: (id_empleado: string) => RetoRepository.getHistorialLogros(id_empleado),

    /**
     * Se llama tras cada venta confirmada.
     * Devuelve la lista de retos recién completados para disparar la animación en el POS.
     */
    actualizarProgresoVenta: async (input: ActualizarProgresoInput) => {
        const { id_empleado, id_empresa, id_corte, fecha_dia, total_venta, num_ventas_incremento, detalles } = input;

        const retosActivos = await RetoRepository.getAllPorEmpresa(id_empresa);
        const retosCompletados: any[] = [];

        const t = await dbLocal.transaction();
        try {
            for (const reto of retosActivos) {
                if (!reto.activo) continue;

                const periodo_ref = reto.periodo === 'CORTE' ? id_corte : fecha_dia;
                let incremento = 0;

                switch (reto.tipo_reto) {
                    case 'MONTO':
                        incremento = total_venta;
                        break;

                    case 'NUM_VENTAS':
                        incremento = num_ventas_incremento;
                        break;

                    case 'CANTIDAD_ARTICULO': {
                        const linea = detalles.find(d => d.id_artic === reto.id_articulo);
                        incremento = linea ? linea.cantidad : 0;
                        break;
                    }

                    case 'CATEGORIA': {
                        const lineasCat = detalles.filter(d => d.id_categoria === reto.id_categoria);
                        if (reto.tipo_objetivo_categoria === 'MONTO') {
                            incremento = lineasCat.reduce((s, d) => s + d.cantidad * d.precio_unitario, 0);
                        } else {
                            incremento = lineasCat.reduce((s, d) => s + d.cantidad, 0);
                        }
                        break;
                    }
                }

                if (incremento <= 0) continue;

                const { recienCompletado, reto: retoObj } = await RetoRepository.upsertProgreso(
                    reto.id_reto, id_empleado, periodo_ref, incremento, t
                );

                if (recienCompletado && retoObj) {
                    await RetoRepository.registrarLogro(
                        reto.id_reto, id_empleado, retoObj.puntos_reto, periodo_ref, t
                    );
                    retosCompletados.push({
                        id_reto: reto.id_reto,
                        nombre_reto: reto.nombre_reto,
                        icono_reto: reto.icono_reto,
                        puntos_reto: reto.puntos_reto,
                    });
                }
            }

            await t.commit();
            return { retosCompletados };
        } catch (e) {
            await t.rollback();
            throw e;
        }
    },
};

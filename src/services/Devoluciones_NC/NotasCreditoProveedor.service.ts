import { Transaction } from "sequelize";
import { INotasCreditoProveedor } from "../../interface/Devolucion_NC/NotaCredito.interface";
import { Compra_ProveedorRepository } from "../../modules/Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import { NotasCreditoProveedorRepository } from "../../repository/Devoluciones_NC/NC/NotasCreditoProveedor.repository";
import { dbLocal } from "../../config/db";
import { trace } from "console";

export const NotasCreditoProveedorService = {
    createNotaDeCredito: async (data: INotasCreditoProveedor) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        try {
            const compraProveedor = await Compra_ProveedorRepository.getByID(data.id_compra_proveedor)
            if (!compraProveedor) {
                //FALTA AGREGAR INFORMACION DE ERROR 
                return
            }
            await NotasCreditoProveedorRepository.create(data, { transaction: t })
            //CONSEGURI LAS NOTAS DE CREDITO DE ESA COMPRA PARA SABER SI YA TIENE MAS Y ACOMPLETA 
            const notas = await NotasCreditoProveedorRepository.getNotasCreditoByCompraProveedor(data.id_compra_proveedor, { transaction: t })


            //VERIFICAR QUE SI CUEADRAN LA COMPRA Y TOTAL 
            const totalFactura = Number(compraProveedor.total_comp_factura) + Number(compraProveedor.total_iva_factura)
            const totalRecibido = Number(compraProveedor.total_comp_recibido) + Number(compraProveedor.total_iva_recibido) + Number(data.total_nc)

            const totalNotas = notas.reduce(
                (acc, nc) => acc + Number(nc.total_nc ?? 0),
                0
            );

            const totalConNotas = totalRecibido + totalNotas;

            // 5. Comparar en centavos para evitar problemas con decimales
            const normalizar = (num: number) => Math.round(num * 100);

            //FINALIZAR COMPRA PORQUE LA NOTA DE CREDITO IGUALA EL TOTAL DE LA FACTURA CON LO RECIBIDO 
            if (normalizar(totalFactura) === normalizar(totalConNotas)) {
                await Compra_ProveedorRepository.updateEstado(
                    data.id_compra_proveedor,
                    "F", // o el estado que uses
                    { transaction: t }
                );
            }
            await t.commit();
            return { ok: true };

        } catch (error) {
            await t.rollback();
            throw error;
        }
    },

    getNotasCreditoByCompraProveedor: async (id_compra_proveedor: string) => {
        return NotasCreditoProveedorRepository.getNotasCreditoByCompraProveedor(id_compra_proveedor)
    }

}

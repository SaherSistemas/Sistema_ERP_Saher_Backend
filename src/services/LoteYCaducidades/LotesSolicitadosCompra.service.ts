import { IDataLotesRecibidos } from "../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface";
import { Compra_ProveedorRepository } from "../../repository/Compras/Compra_Proveedor.repository";
import { LotesSolicitadoCompraRepository } from "../../repository/LotesYCaducidad/LotesSolicitadosCompra.repository";
export const LotesSolicitadoCompraService = {

    guardarLoteCompraSolicitada: async (data: any) => {
        const { id_comp } = data;


        let totalFactura = 0;

        const productosMapeados = data.productos.map((producto: any) => {
            if (!producto.lotes || producto.lotes.length === 0) {
                throw new Error(`Producto inválido o sin lotes: ${JSON.stringify(producto)}`);
            }

            const lotesMapeados = producto.lotes.map((lote: any) => {
                if (!lote.numerolote_lote || !lote.fechavencimiento_lote || typeof lote.cantidad_lote !== 'number') {
                    throw new Error(`Datos de lote incompletos: ${JSON.stringify(lote)}`);
                }

                return {
                    numerolote_lote: lote.numerolote_lote,
                    fechavencimiento_lote: lote.fechavencimiento_lote,
                    cantidad_lote: lote.cantidad_lote,
                    observacion_lote: lote.observacion_lote || null
                };
            });

            // ✅ Sumar cantidades y calcular total por producto
            const totalCantidad = lotesMapeados.reduce((acc, lote) => acc + lote.cantidad_lote, 0);
            const subtotal = totalCantidad * producto.precio;
            totalFactura += subtotal;

            return {
                id_detallecompr_solicitado: producto.id_detcompsol,
                lotes: lotesMapeados
            };
        });

        console.log(`🧾 Total de la factura calculado: $${totalFactura.toFixed(2)}`);

        const resultado = await LotesSolicitadoCompraRepository.create({
            id_comp: data.id_comp,
            productos: productosMapeados
        });

        //DARLE TOTAL A LA COMPRA PROVEEDOR Y FACTURA UN TOTAL(FACTURA)

        const cambiarTotalFactura = await Compra_ProveedorRepository.cambiarTotalFactura(id_comp, totalFactura)
        return {
            resultado,
            totalFactura
        };
    }


}
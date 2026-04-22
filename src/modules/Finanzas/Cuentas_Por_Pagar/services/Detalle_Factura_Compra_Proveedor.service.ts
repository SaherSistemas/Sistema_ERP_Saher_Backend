import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor, IGuardarCapturaCompletaControllerDTO } from "../interface/Factura_Compra_Proveedor.interfece";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { ICrearDetallesFacturaRepoDTO, IModificarLotesDetalleFacturaDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";

import { Detalle_Compra_RecibidosRepository } from "../../../Compras/Ordenes-Compra/repositories/Detalle_Compra_Recibido.repository";

export const Detalle_Factura_Compra_ProveedorService = {
    modificarLotesYDetallesRecibidosFacturaProveedor: async (data: IModificarLotesDetalleFacturaDTO, usuario_empleado_chequeo: string) => {
        const t = await dbLocal.transaction({
            isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
        });
        // console.log("DATA RECIBIDA EN SERVICE:", data);

        //MARCAR DETALLE FACTURA COMPRA PROVEEDOR COMO RECIBIDO
        const detalle = await Detalle_Factura_Compra_ProveedorRepository.marcarDetalleFacturaCompraProveedorComoRecibido(data.id_factura_proveedor_detalle, t);

        //ACTUALIZAR ESTADO FACTURA  R: RECIBIDA
        await Factura_Compra_ProveedorRepository.recibirFacturaCompraProveedor(detalle.id_factura_compra_proveedor, t, usuario_empleado_chequeo);


        //ACTUALIZAR LOTES FACTURA COMPRA PROVEEDOR 
        // console.log("DATA RECIBIDA EN SERVICE:", data);
        const articuloYLote = await Detalle_Compra_RecibidosRepository.updateLoteDetalleComproRecibido(data, t)
        // const lote = await Lote_Factura_Compra_ProveedorRepository.updateLoteFacturaCompraProveedor(data);



        t.commit()
        return detalle;
    },

    // Service
    guardarLineaFactura: async (id_factura: string, linea: any) => {
        return await Detalle_Factura_Compra_ProveedorRepository.guardarLineaFactura(id_factura, linea);
    },
    getLineasFactura: async (id_factura: string) => {
        return await Detalle_Factura_Compra_ProveedorRepository.getLineasFactura(id_factura);
    },
}
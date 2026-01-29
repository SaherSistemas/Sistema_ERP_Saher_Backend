import { Transaction } from "sequelize";
import { dbLocal } from "../../../../config/db";
import { ICreateFacturaCompraProveedor, IFactura_Compra_Proveedor, IGuardarCapturaCompletaControllerDTO } from "../interface/Factura_Compra_Proveedor.interfece";
import { Detalle_Factura_Compra_ProveedorRepository } from "../repositories/Detalle_Factura_Compra_Proveedor.repository";
import { Factura_Compra_ProveedorRepository } from "../repositories/Factura_Compra_Proveedor.repository";
import { Detalle_Compra_RecibidoService } from "../../../Compras/Ordenes-Compra/services/Detalle_Compra_Recibido.service";
import { LotesSolicitadoCompraRepository } from "../../../../repository/LotesYCaducidad/LotesSolicitadosCompra.repository";
import { IDataLotesRecibidos, IDetalleSolicitado, ILoteRecibido } from "../../../../interface/LotesYCaducidad/LotesSolicitadoCompra.interface";
import { ICrearDetallesFacturaRepoDTO, IModificarLotesDetalleFacturaDTO } from "../interface/Detalle_Factura_Compra_Proveedor.interface";
import { Lote_Factura_Compra_ProveedorRepository } from "../repositories/Lote_Factura_Compra_ProveedorRepository.repository";
import { ICrearLotesFacturaRepoDTO } from "../interface/Lote_Factura_Compra_Proveedor.interface";
import { Compra_ProveedorRepository } from "../../../Compras/Ordenes-Compra/repositories/Compra_Proveedor.repository";
import { CompraGeneralRepository } from "../../../Compras/Ordenes-Compra/repositories/Compra_General.repository";

export const Detalle_Factura_Compra_ProveedorService = {
    modificarLotesYDetallesRecibidosFacturaProveedor: async (data: IModificarLotesDetalleFacturaDTO) => {

        //ACTUALIZAR LOTES FACTURA COMPRA PROVEEDOR 
        const lote = await Lote_Factura_Compra_ProveedorRepository.updateLoteFacturaCompraProveedor(data);

        //MARCAR DETALLE FACTURA COMPRA PROVEEDOR COMO RECIBIDO
        const detalle = await Detalle_Factura_Compra_ProveedorRepository.marcarDetalleFacturaCompraProveedorComoRecibido(data.id_factura_proveedor_detalle);

        //ACTUALIZAR ESTADO FACTURA  R: RECIBIDA
        await Factura_Compra_ProveedorRepository.recibirFacturaCompraProveedor(detalle.id_factura_compra_proveedor);
        return detalle;
    },

}
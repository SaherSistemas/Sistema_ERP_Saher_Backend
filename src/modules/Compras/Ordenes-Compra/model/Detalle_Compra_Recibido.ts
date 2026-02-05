import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, HasOne } from "sequelize-typescript";
import Compra from './Compra_Proveedor'
import Detalle_Compra_Solicitado from "./Detalle_Compra_Solicitado";
import LotesRecibidosCompra from "../../../../models/LotesYCaducidad/LotesRecibidosCompra";
import Detalle_Factura_Compra_Proveedor from "../../../Finanzas/Cuentas_Por_Pagar/model/Detalle_Factura_Compra_Proveedor";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";

@Table({
    tableName: 'detalle_compra_recibido'
})

class Detalle_Compra_Recibido extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_detcomprec: string

    @ForeignKey(() => Compra)
    @Column({
        type: DataType.UUID
    })
    declare idcompr_detcomprec: string



    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID
    })
    declare idarticulo_detcomprec: string

    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad_detcomprec: number

    //CON ESTE PRECIO CALCULARE EL MARGEN DE GANANCIA
    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare precio_detcomprec: number


    @ForeignKey(() => Detalle_Factura_Compra_Proveedor)
    @Column(DataType.UUID)
    declare id_detalle_factura_compra_proveedor: string;


    @BelongsTo(() => Compra)
    declare compra: Compra;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;

    @BelongsTo(() => Detalle_Factura_Compra_Proveedor)
    detalleFacturaCompraProveedor: Detalle_Factura_Compra_Proveedor;

    @HasMany(() => LotesRecibidosCompra)
    lotesRecibidos: LotesRecibidosCompra[];
}

export default Detalle_Compra_Recibido
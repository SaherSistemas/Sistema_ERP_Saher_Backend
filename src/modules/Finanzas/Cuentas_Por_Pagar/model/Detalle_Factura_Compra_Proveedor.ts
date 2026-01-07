import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Factura_Compra_Proveedor from "./Factura_Compra_Proveedor";
import Articulo from "../../../../models/Articulos/Articulo";
import Detalle_Compra_Recibido from "../../../Compras/model/Detalle_Compra_Recibido";

@Table({
    tableName: 'detalle_factura_compra_proveedor',
})
class Detalle_Factura_Compra_Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_factura_proveedor_detalle: string

    @ForeignKey(() => Factura_Compra_Proveedor)
    @Column({
        type: DataType.UUID
    })
    declare id_factura_compra_proveedor: string


    @BelongsTo(() => Factura_Compra_Proveedor)
    factura!: Factura_Compra_Proveedor;


    @ForeignKey(() => Detalle_Compra_Recibido)
    @Column({
        type: DataType.UUID
    })
    declare id_detallecomprec_det_factura_compr_prov: string


    @BelongsTo(() => Detalle_Compra_Recibido)
    detalleCompraRecibido!: Detalle_Compra_Recibido;

}

export default Detalle_Factura_Compra_Proveedor;
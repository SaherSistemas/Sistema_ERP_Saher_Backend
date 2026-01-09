import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Factura_Compra_Proveedor from "./Factura_Compra_Proveedor";
import Articulo from "../../../../models/Articulos/Articulo";
import Detalle_Compra_Recibido from "../../../Compras/model/Detalle_Compra_Recibido";
import Detalle_Compra_Solicitado from "../../../Compras/model/Detalle_Compra_Solicitado";

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


    @ForeignKey(() => Detalle_Compra_Solicitado)
    @Column({
        type: DataType.UUID
    })
    declare id_detcompsol: string


    @BelongsTo(() => Detalle_Compra_Solicitado)
    detalleCompraSolicitado!: Detalle_Compra_Solicitado;


    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad_articulo_facturada: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare precio_articulo_factura: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare descuento_articulo_factura: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare iva_articulo_factura: number



}

export default Detalle_Factura_Compra_Proveedor;
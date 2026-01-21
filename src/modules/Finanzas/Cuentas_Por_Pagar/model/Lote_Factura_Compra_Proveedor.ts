import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
//import { DetalleFacturaCompraProveedorMap } from "../map/Detalle_Factura_Compra_Proveedor.map";
import Detalle_Factura_Compra_Proveedor from "./Detalle_Factura_Compra_Proveedor";

@Table({
    tableName: 'lote_factura_compra_proveedor',
})
class Lote_Factura_Compra_Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_lote_factura_compra_proveedor: string

    @ForeignKey(() => Detalle_Factura_Compra_Proveedor)
    @Column({
        type: DataType.UUID
    })
    declare id_det_factura_proveedor: string

    @BelongsTo(() => Detalle_Factura_Compra_Proveedor, {
        foreignKey: 'id_det_factura_proveedor',
        targetKey: 'id_factura_proveedor_detalle',
    })
    detalleFacturaCompraProveedor!: Detalle_Factura_Compra_Proveedor;


    @Column({
        type: DataType.STRING(50)
    })
    declare numero_lote: string

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare precio_articulo_factura: number

    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_caducidad: Date

    @Column({
        type: DataType.SMALLINT
    })
    declare cantidad_lote: number


    @Column({
        type: DataType.STRING(100)
    })
    declare observacion_lote: string | null
}

export default Lote_Factura_Compra_Proveedor;
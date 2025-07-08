import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra_Proveedor from "../Compra/Compra_Proveedor";

@Table({
    tableName: 'factura_compra_proveedor',
})
class Factura_Compra_Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_factura_proveedor: string

    @ForeignKey(() => Compra_Proveedor)
    @Column({
        type: DataType.UUID
    })
    declare id_compra_proveedor: string

    @Column({
        type: DataType.STRING(20)
    })
    declare folio_factura_proveedor: string

    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_emision: Date;


    @Column({
        type: DataType.DATEONLY
    })
    declare fecha_vencimiento: Date

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_factura_proveedor: number

    @Column({
        type: DataType.STRING(50)
    })
    declare estatus_pago_factura: string

    @Column({
        type: DataType.STRING(255)
    })
    declare url_PDF: string

    @Column({
        type: DataType.STRING(255)
    })
    declare url_XML: string

    @BelongsTo(() => Compra_Proveedor)
    compra!: Compra_Proveedor;

}

export default Factura_Compra_Proveedor;
import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Compra_Proveedor from "../../../Compras/model/Compra_Proveedor";
import Empleado from "../../../RRHH/model/Empleado";
import Detalle_Factura_Compra_Proveedor from "./Detalle_Factura_Compra_Proveedor";

@Table({
    tableName: 'factura_compra_proveedor',
})
class Factura_Compra_Proveedor extends Model {
    /*
    ESTADO FACTURAS 
    C: Capturada
    R: RECIBIDA
    C: CHECADA
    A: ACOMODADA
    F: FINALIZADA
    */


    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_factura_proveedor: string

    @ForeignKey(() => Compra_Proveedor)
    @Column({
        type: DataType.UUID
    })
    declare id_compra_prove_factura: string

    @BelongsTo(() => Compra_Proveedor, 'id_compra_prove_factura')
    compra!: Compra_Proveedor;

    @Column({
        type: DataType.STRING(20)
    })
    declare folio_factura_proveedor: string

    @Column({
        type: DataType.CHAR(1)
    })
    declare estado_factura_proveedor: string

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
        type: DataType.DECIMAL(12, 2)
    })
    declare total_iva_factura: number


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


    @Column({
        type: DataType.DATE
    })
    declare inicio_de_registro_lotes: Date

    @Column({
        type: DataType.DATE
    })
    declare fin_de_registro_lotes: Date




    // Quién checó la mercancía
    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID })
    declare id_empleado_registro_lotes: string;

    @BelongsTo(() => Empleado, 'id_empleado_registro_lotes')
    empleado_registro_lotes: Empleado;




    @Column({
        type: DataType.DATE
    })
    declare inicio_de_checado: Date

    @Column({
        type: DataType.DATE
    })
    declare fin_de_checado: Date




    // Quién checó la mercancía
    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID })
    declare id_empleado_checado: string;

    @BelongsTo(() => Empleado, 'id_empleado_checado')
    empleado_checado: Empleado;



    @Column({
        type: DataType.DATE
    })
    declare inicio_acomodo_mercancia: Date

    @Column({
        type: DataType.DATE
    })
    declare fin_acomodo_mercancia: Date





    // Quién acomodó la mercancía
    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID })
    declare id_empleado_acomodo: string;

    @BelongsTo(() => Empleado, 'id_empleado_acomodo')
    empleado_acomodo: Empleado;




    //HASMANY
    @HasMany(() => Detalle_Factura_Compra_Proveedor)
    detalles_factura_compra_proveedor!: Detalle_Factura_Compra_Proveedor[];

}

export default Factura_Compra_Proveedor;
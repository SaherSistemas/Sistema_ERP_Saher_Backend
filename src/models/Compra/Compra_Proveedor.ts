import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany } from "sequelize-typescript";
import Proveedor from "../Proveedor/Proveedor";
import Detalle_Compra_Solicitado from "./Detalle_Compra_Solicitado";
import Compra_General from "./Compra_General";
import Factura_Compra_Proveedor from "../Proveedor/Factura_Compra_Proveedor";
import Empleado from "../Usuarios/Empleado";

@Table({
    tableName: 'compra_proveedor',
    timestamps: false
})
class Compra_Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_comp: string

    @ForeignKey(() => Proveedor)
    @Column({
        type: DataType.UUID
    })
    declare idprove_comp: string

    @Column({
        type: DataType.STRING(20)
    })
    declare folio_factura_compra: string

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_comp_factura: number


    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_iva_factura: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_comp_recibido: number

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_iva_recibido: number
    //NUEVO CAMPO
    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare costo_por_envio: number


    @Column({
        type: DataType.CHAR(1)
    })
    declare estado_comp: string

    @ForeignKey(() => Compra_General)
    @Column({
        type: DataType.UUID
    })
    declare id_compra_general: string

    @Column({
        type: DataType.DATE
    })
    declare inicio_de_compra_proveedor: Date
    @Column({
        type: DataType.DATE
    })
    declare fin_de_compra_proveedor: Date

    // Quién generó la compra
    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID })
    declare id_empleado_compra: string;

    @BelongsTo(() => Empleado, 'id_empleado_compra')
    empleado_compra: Empleado;

    @Column({
        type: DataType.DATE
    })
    declare fecha_enviada_proveedor: Date

    @Column({
        type: DataType.DATE
    })
    declare fecha_mercancia_recibida_proveedor: Date

    // Quién recibió la mercancía
    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID })
    declare id_empleado_recibio: string;

    @BelongsTo(() => Empleado, 'id_empleado_recibio')
    empleado_recibio: Empleado;

    @Column({
        type: DataType.DATE
    })
    declare inicio_de_registro_lotes: Date

    @Column({
        type: DataType.DATE
    })
    declare fin_de_registro_lotes: Date


    // Quién registró los lotes
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


    // Quién acomodó la mercancía
    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID })
    declare id_empleado_acomodo: string;

    @BelongsTo(() => Empleado, 'id_empleado_acomodo')
    empleado_acomodo: Empleado;

    @Column({
        type: DataType.DATE
    })
    declare fin_acomodo_mercancia: Date
    /*  FALTA AGREGAR QUIEN FUE EL QUE HIZO LA COMPRA, ACOMODO  */

    @BelongsTo(() => Compra_General)
    compra_general: Compra_General

    @BelongsTo(() => Proveedor)
    proveedor: Proveedor;

    @HasMany(() => Factura_Compra_Proveedor)
    facturas!: Factura_Compra_Proveedor[];



    @HasMany(() => Detalle_Compra_Solicitado)
    declare detallesCompra: Detalle_Compra_Solicitado[];
}

export default Compra_Proveedor;
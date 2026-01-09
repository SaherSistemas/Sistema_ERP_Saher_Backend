import { Table, Column, DataType, Model, PrimaryKey, ForeignKey, Unique, BelongsTo, HasMany, Default } from "sequelize-typescript";

import Detalle_Compra_Solicitado from "./Detalle_Compra_Solicitado";
import Compra_General from "./Compra_General";
import Proveedor from "../../Proveedores/model/Proveedor";
import Empleado from "../../../models/Usuarios/Empleado/Empleado";
import Factura_Compra_Proveedor from "../../Finanzas/Cuentas_Por_Pagar/model/Factura_Compra_Proveedor";


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

    @Default(0)
    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_comp_factura: number

    @Default(0)
    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_iva_factura: number

    @Default(0)
    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare total_comp_recibido: number

    @Default(0)
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
    declare inicio_de_registro_lotes: Date

    @Column({
        type: DataType.DATE
    })
    declare fin_de_registro_lotes: Date


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
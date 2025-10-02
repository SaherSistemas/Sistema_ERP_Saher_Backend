import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Colonia from "../../Ubicacion/Colonia";
import Cat_Regimen_Fiscal from "../../Catalogos/Cat_Regimen_Fiscal";
import Metodo_de_Pago from "../../Caja/Metodo_de_Pago";
import Cat_Tipo_De_Pago from "../../Catalogos/Cat_Tipo_De_Pago";
import Cat_uso_CFDI from "../../Catalogos/Cat_Uso_CFDI";
import Agente_de_Venta from "../../Usuarios/Agente_De_Ventas/Agente_De_Venta";

@Table({
    tableName: "cliente_almacen"
})


class Cliente_Almacen extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
    })
    declare id_ciente_alm: string;

    @Unique
    @Column({
        type: DataType.SMALLINT
    })
    declare id_interno_cliente_alm: number

    @Column({
        type: DataType.STRING(70)
    })
    declare razon_social_cliente_alm: string

    @Column({
        type: DataType.STRING(50)
    })
    declare nom_corto_cliente_alm: string

    @Column({
        type: DataType.STRING(25)
    })
    declare nombre_cliente_alm: string

    @Column({
        type: DataType.STRING(30)
    })
    declare apellido_pat_cliente_alm: string

    @Column({
        type: DataType.STRING(30)
    })
    declare apellido_mat_cliente_alm: string

    @Column({
        type: DataType.STRING(30)
    })
    declare curp_cliente_alm: string

    @Column({
        type: DataType.STRING(30)
    })
    declare rfc_cliente_alm: string

    @Column({
        type: DataType.STRING(70)
    })
    declare calle_cliente_alm: string

    @ForeignKey(() => Colonia)
    @Column({
        type: DataType.UUID
    })
    declare id_colonia_cliente_alm: string

    @Column({
        type: DataType.STRING(20)
    })
    declare num_telefono_cliente_alm: string

    @Column({
        type: DataType.DECIMAL(12, 2)
    })
    declare limite_credito_cliente_alm: number

    @Column({
        type: DataType.SMALLINT
    })
    declare plazo_pago_cliente_alm: number


    @ForeignKey(() => Agente_de_Venta)
    @Column({
        type: DataType.UUID
    })
    declare id_agente_cliente_alm: string

    @Column({
        type: DataType.STRING(100)
    })
    declare email_cliente_alm: string

    @ForeignKey(() => Cat_Regimen_Fiscal)
    @Column({
        type: DataType.STRING(3)
    })
    declare id_regimen_fiscal_cliente_alm: string

    @ForeignKey(() => Metodo_de_Pago)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_forma_pago_cliente_alm: number          //EFECTIVO, TARJETA, DEBITO, TRANSFERENCIA, CHEQUE 

    @ForeignKey(() => Cat_Tipo_De_Pago)
    @Column({
        type: DataType.STRING(3)
    })
    declare tipo_de_pago_cliente_alm: string            //PUE, PPD ETC

    @ForeignKey(() => Cat_uso_CFDI)
    @Column({
        type: DataType.STRING(3)
    })
    declare uso_cfdi_cliente_alm: string
}
export default Cliente_Almacen;
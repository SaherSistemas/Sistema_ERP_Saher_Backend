import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, Unique, BelongsTo, Default, HasOne } from "sequelize-typescript";
import Colonia from "../../Ubicacion/Colonia";

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

}
export default Cliente_Almacen;
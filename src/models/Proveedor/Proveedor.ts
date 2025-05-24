import { Column, Model, DataType, Table, PrimaryKey, Unique, ForeignKey, BelongsTo, BelongsToMany, HasMany, HasOne } from 'sequelize-typescript'
import Compra from '../Compra/Compra'
import Colonia from '../Ubicacion/Colonia'
import Listado_Proveedor from './Listados_Proveedor'
@Table({
    tableName: "proveedor"
})

class Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_prove: string

    @Unique
    @Column({
        type: DataType.STRING(100),
        allowNull: false
    })
    declare nomcort_prove: string

    @Unique
    @Column({
        type: DataType.STRING(100),
        allowNull: false
    })
    declare razsoc_prove: string

    @Unique
    @Column({
        type: DataType.STRING(13),
        allowNull: false
    })
    declare rfc_prove: string

    @Column({
        type: DataType.STRING(50),
        allowNull: false
    })
    declare calle_prove: string

    @ForeignKey(() => Colonia)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_colonia_prove: string


    @Column({
        type: DataType.STRING(15),
        allowNull: false
    })
    declare telef_prove: string

    @Column({
        type: DataType.STRING(80),
        allowNull: false
    })
    declare corr_prove: string

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare diascre_prove: number

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare limicre_prove: number

    @Column({
        type: DataType.BOOLEAN,
        allowNull: false,
        defaultValue: true
    })
    declare activo_prove: boolean

    @Column({
        type: DataType.SMALLINT,
        allowNull: false
    })
    declare plazoentrega_prove: number

    @Column({
        type: DataType.STRING(20),
        allowNull: false
    })
    declare ctabanca_prove: string

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare condpago_prove: string


    @BelongsTo(() => Colonia)
    colonia: Colonia

    @HasMany(() => Compra)
    compras: Compra[];

    @HasOne(() => Listado_Proveedor)
    listado_proveedor: Listado_Proveedor;
}

export default Proveedor
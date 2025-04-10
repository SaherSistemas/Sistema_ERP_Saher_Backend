import { Column, Model, DataType, Table, PrimaryKey, Unique, ForeignKey, BelongsTo } from 'sequelize-typescript'
import Listados_Proveedor from './Listados_Proveedor'


@Table({
    tableName: "detalle_listado_proveedor"
})


class Detalle_Listado_Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_detlist: string

    @ForeignKey(() => Listados_Proveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_list_detlist: string

    @Column({
        type: DataType.STRING(20),
        allowNull: false,
    })
    declare cod_barra_pro_detlist: string

    @Column({
        type: DataType.STRING(150),
        allowNull: false,
    })
    declare descrip_pro_detlis: string

    @Column({
        type: DataType.INTEGER,
    })
    declare exist_pro_detlist: number

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare preio_pro_detlist: number

    // Relación: Un estado pertenece a un país
    @BelongsTo(() => Listados_Proveedor)
    listado_proveedor: Listados_Proveedor;
}

export default Detalle_Listado_Proveedor;
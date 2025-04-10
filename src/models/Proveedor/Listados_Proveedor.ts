import { Column, Model, DataType, Table, PrimaryKey, Unique, ForeignKey, BelongsTo } from 'sequelize-typescript'
import Proveedor from '../Proveedor/Proveedor'


@Table({
    tableName: "listados_proveedor"
})


class Listado_Proveedor extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_listprove: string

    @ForeignKey(() => Proveedor)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_prove_listprove: string

    // Relación: Un estado pertenece a un país
    @BelongsTo(() => Proveedor)
    proveedor: Proveedor;
}

export default Listado_Proveedor;
import { Column, Model, DataType, Table, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript'
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal'
import Articulo from '../../../Catalogos/Articulos/model/Articulo'
import Empleado from '../../../RRHH/model/Empleado'

@Table({ tableName: 'movimiento_articulo', timestamps: false })
class Movimiento_Articulo extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID, defaultValue: DataType.UUIDV4 })
    declare id_movimiento_articulo: string

    @ForeignKey(() => Empresa_Sucursal)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa: string

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa: Empresa_Sucursal

    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string

    @BelongsTo(() => Articulo)
    declare articulo: Articulo

    @Column({
        type: DataType.ENUM('AJUSTE_ENTRADA', 'SALIDA_MERMA', 'SALIDA_ENTREGA'),
        allowNull: false
    })
    declare tipo_movimiento: 'AJUSTE_ENTRADA' | 'SALIDA_MERMA' | 'SALIDA_ENTREGA'

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare cantidad: number

    @Column({ type: DataType.DATE, allowNull: false })
    declare fecha: Date

    @Column({ type: DataType.UUID, allowNull: true })
    declare documento_ref: string | null

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null

    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empleado: string

    @BelongsTo(() => Empleado)
    declare empleado: Empleado
}

export default Movimiento_Articulo

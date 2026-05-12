import { Column, Model, DataType, Table, PrimaryKey, ForeignKey, BelongsTo } from 'sequelize-typescript'
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal'
import Articulo from '../../../Catalogos/Articulos/model/Articulo'
import Lote_Articulo_Sucursal from '../../../Inventario/Lotes/model/Lote_Articulo_Sucursal'
import Ubicacion_Sucursal from '../../Ubicaciones/model/Ubicacion_Sucursal'
import Pedido_Almacen from '../../Pedido/model/Pedido_Almacen'
import Empleado from '../../../RRHH/model/Empleado'

@Table({
    tableName: "kardex_movimientos_articulos",
    timestamps: false
})
class Kardex_Movimientos_Articulos extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        allowNull: false,
        defaultValue: DataType.UUIDV4
    })
    declare id_kardex_movimientos: string

    @ForeignKey(() => Empresa_Sucursal)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_empresa: string

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa: Empresa_Sucursal

    @Column({
        type: DataType.DATE,
        allowNull: false
    })
    declare fecha: Date

    @ForeignKey(() => Articulo)
    @Column({
        type: DataType.UUID,
        allowNull: false,
    })
    declare id_articulo: string

    @BelongsTo(() => Articulo)
    declare articulo: Articulo

    @ForeignKey(() => Lote_Articulo_Sucursal)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare id_lote: string | null

    @BelongsTo(() => Lote_Articulo_Sucursal)
    declare lote: Lote_Articulo_Sucursal

    @Column({
        type: DataType.ENUM('ENTRADA', 'SALIDA', 'TRASLADO', 'AJUSTE', 'SURTIDO', 'VENTA'),
        allowNull: false,
    })
    declare tipo_movimiento: string

    @Column({
        type: DataType.ENUM('Entrada_Salida', 'Movimiento_Interno', 'Movimiento_Externo', 'AJUSTES'),
        allowNull: false,
    })
    declare categoria: string

    @ForeignKey(() => Ubicacion_Sucursal)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare id_origen_ubicacion: string | null

    @BelongsTo(() => Ubicacion_Sucursal, 'id_origen_ubicacion')
    declare origen_ubicacion: Ubicacion_Sucursal

    @ForeignKey(() => Ubicacion_Sucursal)
    @Column({
        type: DataType.UUID,
        allowNull: true,
    })
    declare id_destino_ubicacion: string | null

    @BelongsTo(() => Ubicacion_Sucursal, 'id_destino_ubicacion')
    declare destino_ubicacion: Ubicacion_Sucursal

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare cantidad_movimiento: number

    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare documento_ref: string | null

    @ForeignKey(() => Pedido_Almacen)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare id_pedido: string | null

    @BelongsTo(() => Pedido_Almacen)
    declare pedido: Pedido_Almacen

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_empleado: string

    @BelongsTo(() => Empleado)
    declare empleado: Empleado

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare notas: string | null
}

export default Kardex_Movimientos_Articulos
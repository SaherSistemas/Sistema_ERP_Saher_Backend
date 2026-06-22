import {
    Table, Column, Model, PrimaryKey, DataType, Default,
    ForeignKey, BelongsTo, HasMany,
} from 'sequelize-typescript';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Detalle_Inventario from './Detalle_Inventario';

export type TipoInventario = 'GENERAL' | 'PASILLO' | 'UBICACION' | 'ARTICULO';
export type StatusInventario = 'BORRADOR' | 'EN_CONTEO' | 'TERMINADO' | 'APLICADO' | 'CANCELADO';

@Table({ tableName: 'inventario', timestamps: true })
export default class Inventario extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_inventario: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa_sucursal: string;

    @Column({ type: DataType.STRING(20), allowNull: false })
    declare tipo_inventario: TipoInventario;

    @Column({ type: DataType.STRING(20), allowNull: false, defaultValue: 'BORRADOR' })
    declare status: StatusInventario;

    // Snapshot del filtro usado al crear (pasillo, id_ubicacion, id_articulo, etc.)
    @Column({ type: DataType.JSONB, allowNull: true })
    declare filtro: object | null;

    @Column({ type: DataType.DATE, allowNull: true })
    declare fecha_aplicacion: Date | null;

    // UUID del empleado que creó
    @Column({ type: DataType.UUID, allowNull: true })
    declare creado_por: string | null;

    // UUID del empleado que aplicó
    @Column({ type: DataType.UUID, allowNull: true })
    declare aplicado_por: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa?: Empresa_Sucursal;

    @HasMany(() => Detalle_Inventario, { foreignKey: 'id_inventario' })
    declare detalles?: Detalle_Inventario[];
}

import {
    Table, Column, Model, PrimaryKey, DataType, Default,
    ForeignKey, BelongsTo,
} from 'sequelize-typescript';
import Inventario from './Inventario';
import Articulo from '../../../Catalogos/Articulos/model/Articulo';
import Ubicacion_Sucursal from '../../../Almacen/Ubicaciones/model/Ubicacion_Sucursal';
import LoteArticuloSucursal from '../../Lotes/model/Lote_Articulo_Sucursal';

@Table({ tableName: 'detalle_inventario', timestamps: true })
export default class Detalle_Inventario extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_detalle_inventario: string;

    @ForeignKey(() => Inventario)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_inventario: string;

    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_articulo: string;

    @ForeignKey(() => Ubicacion_Sucursal)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_ubicacion_sucursal: string | null;

    @ForeignKey(() => LoteArticuloSucursal)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_lote: string | null;

    // Snapshot del sistema al momento de crear el inventario
    @Column({ type: DataType.DECIMAL(13, 4), allowNull: false, defaultValue: 0 })
    declare cant_sistema: number;

    // Lo que contó el capturista (null = aún no contado)
    @Column({ type: DataType.DECIMAL(13, 4), allowNull: true })
    declare cant_contada: number | null;

    @Default(false)
    @Column({ type: DataType.BOOLEAN })
    declare contado: boolean;

    // Si se marcó para ajustar el stock al aplicar
    @Default(true)
    @Column({ type: DataType.BOOLEAN })
    declare ajustar: boolean;

    // Si ya se aplicó el ajuste
    @Default(false)
    @Column({ type: DataType.BOOLEAN })
    declare ajustado: boolean;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare comentario: string | null;

    @BelongsTo(() => Inventario)
    declare inventario?: Inventario;

    @BelongsTo(() => Articulo)
    declare articulo?: Articulo;

    @BelongsTo(() => Ubicacion_Sucursal)
    declare ubicacion?: Ubicacion_Sucursal;

    @BelongsTo(() => LoteArticuloSucursal)
    declare lote?: LoteArticuloSucursal;
}

import {
    Table, Column, Model, DataType, PrimaryKey,
    ForeignKey, BelongsTo, HasMany, AllowNull, Default
} from 'sequelize-typescript';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Articulo from '../../Catalogos/Articulos/model/Articulo';
import Categoria_Articulo from '../../Catalogos/Articulos/model/Categoria_Articulo';

export type TipoReto = 'MONTO' | 'CANTIDAD_ARTICULO' | 'NUM_VENTAS' | 'CATEGORIA';
export type PeriodoReto = 'CORTE' | 'DIA';
export type TipoObjetivoCat = 'MONTO' | 'CANTIDAD';

@Table({ tableName: 'reto', timestamps: true })
class Reto extends Model {
    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_reto: string;

    @Column({ type: DataType.STRING(120), allowNull: false })
    declare nombre_reto: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare descripcion_reto: string;

    @Column({ type: DataType.STRING(30), allowNull: false })
    declare tipo_reto: TipoReto;

    @Column({ type: DataType.STRING(10), allowNull: false })
    declare periodo: PeriodoReto;

    /** Valor objetivo (pesos, cantidad de piezas, número de ventas) */
    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare objetivo: number;

    /** Para CANTIDAD_ARTICULO — artículo específico */
    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_articulo: string | null;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;

    /** Para CATEGORIA */
    @ForeignKey(() => Categoria_Articulo)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_categoria: string | null;

    @BelongsTo(() => Categoria_Articulo)
    declare categoria: Categoria_Articulo;

    /** Para CATEGORIA — mide por monto o cantidad */
    @Column({ type: DataType.STRING(10), allowNull: true })
    declare tipo_objetivo_categoria: TipoObjetivoCat | null;

    @Column({ type: DataType.INTEGER, allowNull: false, defaultValue: 10 })
    declare puntos_reto: number;

    /** Emoji o código de ícono */
    @Column({ type: DataType.STRING(10), allowNull: false, defaultValue: '🏆' })
    declare icono_reto: string;

    @Default(true)
    @Column({ type: DataType.BOOLEAN })
    declare activo: boolean;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empresa: string;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa: Empresa_Sucursal;
}

export default Reto;

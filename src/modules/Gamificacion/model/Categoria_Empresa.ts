import {
    Table, Column, Model, DataType, PrimaryKey,
    ForeignKey, BelongsTo, HasMany
} from 'sequelize-typescript';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';
import Articulo_Categoria_Empresa from './Articulo_Categoria_Empresa';

/**
 * Categoría de identificación por empresa.
 * Independiente de las categorías globales (que son para márgenes/precios).
 * Se usa para retos y presupuesto.
 */
@Table({ tableName: 'categoria_empresa', timestamps: true })
class Categoria_Empresa extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_categoria_empresa: string;

    @Column({ type: DataType.STRING(80), allowNull: false })
    declare nom_categoria_empresa: string;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare descripcion: string | null;

    @Column({ type: DataType.STRING(10), allowNull: true, defaultValue: '📦' })
    declare icono: string | null;

    @ForeignKey(() => Empresa_Sucursal)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_empre: string;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa: Empresa_Sucursal;

    @HasMany(() => Articulo_Categoria_Empresa)
    declare articulos: Articulo_Categoria_Empresa[];
}

export default Categoria_Empresa;

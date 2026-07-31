import {
    Table, Column, Model, DataType, PrimaryKey,
    ForeignKey, BelongsTo
} from 'sequelize-typescript';
import Articulo from '../../Catalogos/Articulos/model/Articulo';
import Categoria_Empresa from './Categoria_Empresa';

/**
 * Tabla pivote: asigna artículos a categorías por empresa.
 * Un artículo puede pertenecer a múltiples categorías empresa.
 */
@Table({ tableName: 'articulo_categoria_empresa', timestamps: false })
class Articulo_Categoria_Empresa extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_artic_cat_emp: string;

    @ForeignKey(() => Articulo)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_artic: string;

    @BelongsTo(() => Articulo)
    declare articulo: Articulo;

    @ForeignKey(() => Categoria_Empresa)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_categoria_empresa: string;

    @BelongsTo(() => Categoria_Empresa)
    declare categoria_empresa: Categoria_Empresa;
}

export default Articulo_Categoria_Empresa;

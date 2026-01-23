import {
    Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default,
    BelongsTo
} from 'sequelize-typescript';
import Parametros_Compra from './Parametros_Compra';
import Categoria_Articulo from '../../../Inventario/Articulos/model/Categoria_Articulo';

@Table({ tableName: 'categoria_excluida_compra' })
class CategoriaExcluidaCompra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_categoria_excluida: string;

    @ForeignKey(() => Parametros_Compra)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @ForeignKey(() => Categoria_Articulo)
    @Column(DataType.UUID)
    declare id_categoria_art: string;

    @BelongsTo(() => Parametros_Compra)
    declare parametro_compra?: Parametros_Compra;

    @BelongsTo(() => Categoria_Articulo)
    declare categoria?: Categoria_Articulo;
}

export default CategoriaExcluidaCompra;

import {
    Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default,
    BelongsTo
} from 'sequelize-typescript';
import Parametros_Compra from './Parametros_Compra';
import Articulo from '../../../Inventario/Articulos/model/Articulo';

@Table({ tableName: 'articulo_excluido_compra' })
class ArticuloExcluidoCompra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_articulo_excluido: string;

    @ForeignKey(() => Parametros_Compra)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @ForeignKey(() => Articulo)
    @Column(DataType.UUID)
    declare id_articulo: string;

    @BelongsTo(() => Parametros_Compra)
    declare parametro_compra?: Parametros_Compra;

    @BelongsTo(() => Articulo)
    declare articulo?: Articulo;
}

export default ArticuloExcluidoCompra;

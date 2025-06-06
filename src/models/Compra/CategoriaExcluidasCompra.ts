import { Table, Column, Model, ForeignKey, DataType, PrimaryKey } from 'sequelize-typescript';
import ParametrosCompra from './Parametros_Compra';
import Categoria_Articulo from '../Articulos/Categoria_Articulo';

@Table({ tableName: 'categorias_excluidas_compra', timestamps: false })
class CategoriaExcluidasCompra extends Model {
    @PrimaryKey
    @ForeignKey(() => ParametrosCompra)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @PrimaryKey
    @ForeignKey(() => Categoria_Articulo)
    @Column(DataType.UUID)
    declare id_categoria_art: string;
}

export default CategoriaExcluidasCompra;

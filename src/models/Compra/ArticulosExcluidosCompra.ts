import { Table, Column, Model, ForeignKey, DataType, PrimaryKey } from 'sequelize-typescript';
import ParametrosCompra from './Parametros_Compra';
import Articulo from '../Articulos/Articulo';

@Table({ tableName: 'articulos_excluidos_compra', timestamps: false })
class ArticulosExcluidosCompra extends Model {
    @PrimaryKey
    @ForeignKey(() => ParametrosCompra)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @PrimaryKey
    @ForeignKey(() => Articulo)
    @Column(DataType.UUID)
    declare id_artic: string;
}

export default ArticulosExcluidosCompra;

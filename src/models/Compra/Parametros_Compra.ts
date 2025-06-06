import { Table, Column, Model, PrimaryKey, DataType, Default, ForeignKey, HasMany } from 'sequelize-typescript';
import Empresa_Sucursal from '../Empresa_Sucursal/Empresa_Sucursal';
import ArticulosExcluidosCompra from './ArticulosExcluidosCompra';
import CategoriasExcluidasCompras from './CategoriaExcluidasCompra';

@Table({ tableName: 'parametros_compra' })
class ParametrosCompra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa: string;

    @HasMany(() => CategoriasExcluidasCompras)
    declare subcategorias_excluidas: CategoriasExcluidasCompras[];

    @HasMany(() => ArticulosExcluidosCompra)
    declare articulos_excluidos: ArticulosExcluidosCompra[];

    @Column(DataType.BOOLEAN)
    declare considerar_temporabilidad: boolean;

    @Column(DataType.SMALLINT)
    declare ventana_dias: number;

    @Column(DataType.SMALLINT)
    declare dias_a_comprar: number;
}

export default ParametrosCompra;

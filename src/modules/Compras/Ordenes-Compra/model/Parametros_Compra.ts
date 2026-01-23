import {
    Table, Column, Model, PrimaryKey, DataType, Default, ForeignKey,
    BelongsTo,
    HasMany
} from 'sequelize-typescript';
import CategoriaExcluidaCompra from './CategoriaExcluidaCompra';
import ArticuloExcluidoCompra from './ArticuloExcluidoCompra';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';

@Table({
    tableName: 'parametros_compra',
    timestamps: true
})
class Parametros_Compra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa: string;

    @Column(DataType.BOOLEAN)
    declare considerar_temporabilidad: boolean;

    @Column(DataType.SMALLINT)
    declare ventana_dias: number;

    @Column(DataType.SMALLINT)
    declare dias_a_comprar: number;


    @BelongsTo(() => Empresa_Sucursal)
    declare empresa_sucursal?: Empresa_Sucursal;

    @HasMany(() => CategoriaExcluidaCompra)
    declare categorias_excluidas?: CategoriaExcluidaCompra[];

    @HasMany(() => ArticuloExcluidoCompra)
    declare articulos_excluidos?: ArticuloExcluidoCompra[];
}

export default Parametros_Compra;

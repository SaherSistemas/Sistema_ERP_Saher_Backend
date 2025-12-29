import { Table, Column, Model, PrimaryKey, ForeignKey, DataType, BelongsTo, Default } from 'sequelize-typescript';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';


@Table({
    tableName: 'ubicacion_articulos'
})
class Ubicacion_Articulos extends Model {
    @PrimaryKey
    @Column(DataType.UUID)
    declare id_ubicacion_articulo: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @Column(DataType.STRING(10))
    declare tarima_ub: string;

    @Column(DataType.STRING(5))
    declare pasillo_ub: string;

    @Column(DataType.STRING(5))
    declare anaquel_ub: string;

    @Column(DataType.STRING(5))
    declare nivel_ub: string;

    @Column(DataType.STRING(5))
    declare posicion_ub: string;





    @BelongsTo(() => Empresa_Sucursal)
    empresa_sucursal: Empresa_Sucursal;
}

export default Ubicacion_Articulos;

import { Table, Column, Model, PrimaryKey, ForeignKey, DataType, BelongsTo, Default, AllowNull } from 'sequelize-typescript';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';


@Table({
    tableName: 'ubicacion_sucursal'
})
class Ubicacion_Sucursal extends Model {
    @PrimaryKey
    @Column(DataType.UUID)
    declare id_ubicacion_sucursal_articulo: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @AllowNull(true)
    @Column(DataType.STRING(10))
    declare tarima_ub: string | null;

    @AllowNull(true)
    @Column(DataType.STRING(5))
    declare pasillo_ub: string | null;

    @AllowNull(true)
    @Column(DataType.STRING(5))
    declare anaquel_ub: string | null;

    @AllowNull(true)
    @Column(DataType.STRING(5))
    declare nivel_ub: string | null;

    @AllowNull(true)
    @Column(DataType.STRING(5))
    declare posicion_ub: string | null;





    @BelongsTo(() => Empresa_Sucursal)
    empresa_sucursal: Empresa_Sucursal;
}

export default Ubicacion_Sucursal;

import {
    Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default,
    BelongsTo
} from 'sequelize-typescript';
import Parametros_Compra from './Parametros_Compra';
import Empresa_Sucursal from '../../../../models/Empresa_Sucursal/Empresa_Sucursal';

// Empresas "vigiladas" de un parámetro de compra: si un artículo se vende en alguna de ellas,
// la compra de la empresa dueña del parámetro lo marca con un aviso.
// La tabla la crea dbLocal.sync() al arrancar el servidor (no necesita migración).
@Table({ tableName: 'empresa_vigilada_compra' })
class EmpresaVigiladaCompra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_empresa_vigilada_compra: string;

    @ForeignKey(() => Parametros_Compra)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa_vigilada: string;

    @BelongsTo(() => Parametros_Compra)
    declare parametro_compra?: Parametros_Compra;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa_vigilada?: Empresa_Sucursal;
}

export default EmpresaVigiladaCompra;

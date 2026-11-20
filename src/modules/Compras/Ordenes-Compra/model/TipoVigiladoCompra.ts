import {
    Table, Column, Model, PrimaryKey, DataType, ForeignKey, Default,
    BelongsTo
} from 'sequelize-typescript';
import Parametros_Compra from './Parametros_Compra';
import Tipo_Articulo from '../../../Catalogos/Articulos/model/Tipo_Articulo';

// Tipos de artículo a los que se limita el aviso de "se vende en otra empresa" de un parámetro de compra
// (por ejemplo solo Patente). Si el parámetro no tiene ninguno, el aviso aplica a todos los artículos.
// La tabla la crea dbLocal.sync() al arrancar el servidor (no necesita migración).
@Table({ tableName: 'tipo_vigilado_compra' })
class TipoVigiladoCompra extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_tipo_vigilado_compra: string;

    @ForeignKey(() => Parametros_Compra)
    @Column(DataType.UUID)
    declare id_parametro_comp: string;

    @ForeignKey(() => Tipo_Articulo)
    @Column(DataType.UUID)
    declare id_tipo_art: string;

    @BelongsTo(() => Parametros_Compra)
    declare parametro_compra?: Parametros_Compra;

    @BelongsTo(() => Tipo_Articulo)
    declare tipo_articulo?: Tipo_Articulo;
}

export default TipoVigiladoCompra;

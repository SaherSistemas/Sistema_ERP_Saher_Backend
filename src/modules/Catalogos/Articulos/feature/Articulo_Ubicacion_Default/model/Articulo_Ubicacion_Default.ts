// src/modules/Inventario/Ubicaciones/model/Articulo_Ubicacion_Default.ts
import {
    Table,
    Column,
    Model,
    PrimaryKey,
    DataType,
    Default,
    ForeignKey,
    BelongsTo,
    Index,
} from "sequelize-typescript";
import Empresa_Sucursal from "../../../../../../models/Empresa_Sucursal/Empresa_Sucursal";
import Ubicacion_Sucursal from "../../../../../Almacen/Ubicaciones/model/Ubicacion_Sucursal";
import Articulo from "../../../model/Articulo";

@Table({
    tableName: "articulo_ubicacion_default",
    timestamps: true,
})
export default class Articulo_Ubicacion_Default extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_articulo_ubicacion_default: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Index
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @ForeignKey(() => Articulo)
    @Index
    @Column(DataType.UUID)
    declare id_articulo: string;

    @ForeignKey(() => Ubicacion_Sucursal)
    @Index
    @Column(DataType.UUID)
    declare id_ubicacion_default: string;

    // Relaciones
    @BelongsTo(() => Empresa_Sucursal)
    declare empresa_sucursal?: Empresa_Sucursal;

    @BelongsTo(() => Articulo)
    declare articulo?: Articulo;

    @BelongsTo(() => Ubicacion_Sucursal)
    declare ubicacion_sucursal?: Ubicacion_Sucursal;
}

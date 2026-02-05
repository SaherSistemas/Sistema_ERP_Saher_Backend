// src/modules/Inventario/Ubicaciones/model/Ubicacion_Articulo.ts
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

import Empresa_Sucursal from "../../../../models/Empresa_Sucursal/Empresa_Sucursal";

import Ubicacion_Sucursal from "./Ubicacion_Sucursal";
import Articulo from "../../../Catalogos/Articulos/model/Articulo";

@Table({
    tableName: "ubicacion_articulo",
    timestamps: true,
})
export default class Ubicacion_Articulo extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_ubicacion_articulo: string;

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
    declare id_ubicacion_sucursal: string;

    // Relaciones
    @BelongsTo(() => Empresa_Sucursal)
    declare empresa_sucursal?: Empresa_Sucursal;

    @BelongsTo(() => Articulo)
    declare articulo?: Articulo;

    @BelongsTo(() => Ubicacion_Sucursal)
    declare ubicacion_sucursal?: Ubicacion_Sucursal;
}

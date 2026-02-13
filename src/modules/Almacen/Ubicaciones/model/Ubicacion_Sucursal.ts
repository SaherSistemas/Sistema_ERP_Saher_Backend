// src/modules/Inventario/Ubicaciones/model/Ubicacion_Sucursal.ts
import {
    Table, Column, Model, PrimaryKey, DataType, Default,
    ForeignKey, BelongsTo, AllowNull, HasMany, Index
} from "sequelize-typescript";
import Empresa_Sucursal from "../../../../models/Empresa_Sucursal/Empresa_Sucursal";

import Stock_Ubicacion_Lote from "../../../Inventario/Stock/model/Stock_Ubicacion_Lote";
import Articulo_Ubicacion_Default from "../../Articulo_Ubicacion_Default/model/Articulo_Ubicacion_Default";

export type TipoUbicacion = "ESTANTERIA" | "TARIMA" | "VIRTUAL";

@Table({
    tableName: "ubicacion_sucursal",
    timestamps: true,
})
export default class Ubicacion_Sucursal extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_ubicacion_sucursal: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Index
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa_sucursal?: Empresa_Sucursal;

    @Default("ESTANTERIA")
    @Column(DataType.ENUM("ESTANTERIA", "TARIMA", "VIRTUAL"))
    declare tipo_ubicacion: TipoUbicacion;


    // TARIMA
    @AllowNull(true)
    @Index
    @Column(DataType.STRING(20))
    declare tarima_ub: string | null;

    // ESTANTERÍA
    @AllowNull(true)
    @Index
    @Column(DataType.STRING(5))
    declare pasillo_ub: string | null;

    @AllowNull(true)
    @Index
    @Column(DataType.STRING(5))
    declare anaquel_ub: string | null;

    @AllowNull(true)
    @Index
    @Column(DataType.STRING(5))
    declare nivel_ub: string | null;

    @AllowNull(true)
    @Index
    @Column(DataType.STRING(5))
    declare posicion_ub: string | null;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare activo: boolean;

    @HasMany(() => Stock_Ubicacion_Lote)
    declare stocks?: Stock_Ubicacion_Lote[];

    @HasMany(() => Articulo_Ubicacion_Default)
    declare ubicaciones_articulos?: Articulo_Ubicacion_Default[];
}

// src/modules/Inventario/Ubicaciones/model/Ubicacion_Sucursal.ts
import {
    Table, Column, Model, PrimaryKey, DataType, Default,
    ForeignKey, BelongsTo, AllowNull, HasMany, Index
} from "sequelize-typescript";
import Empresa_Sucursal from "../../../../models/Empresa_Sucursal/Empresa_Sucursal";

import Ubicacion_Articulo from "./Ubicacion_Articulo";
import Stock_Ubicacion_Lote from "../../../Inventario/Stock/model/Stock_Ubicacion_Lote";

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

    // Identificador humano / técnico. Ej: "RECIBO", "TARIMA-01", "A1-02-03-04"
    @AllowNull(true)
    @Index
    @Column(DataType.STRING(30))
    declare codigo_ubicacion: string | null;

    // Marca esta ubicación como "RECIBO / SIN ACOMODAR" por sucursal
    @Default(false)
    @Index
    @Column(DataType.BOOLEAN)
    declare es_recibo: boolean;

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

    @HasMany(() => Ubicacion_Articulo)
    declare ubicaciones_articulos?: Ubicacion_Articulo[];
}

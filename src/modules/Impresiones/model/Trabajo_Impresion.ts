import {
    Column,
    Model,
    DataType,
    Table,
    PrimaryKey,
    Default,
    AllowNull,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";

import { v4 as uuidv4 } from "uuid";
import Impresora from "./Impresora";

@Table({
    tableName: "trabajo_impresion",
    timestamps: true
})
class Trabajo_Impresion extends Model {

    @PrimaryKey
    @Default(uuidv4)
    @Column({
        type: DataType.UUID
    })
    declare id_trabajo_impresion: string;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(50)
    })
    declare cod_interno_pedido: string;

    @ForeignKey(() => Impresora)
    @AllowNull(true)
    @Column({
        type: DataType.UUID
    })
    declare id_impresora: string | null;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(50)
    })
    declare tipo_documento: string; // TICKET_SURTIDO, TICKET_VENTA, FACTURA

    @AllowNull(true)
    @Column({
        type: DataType.STRING(100)
    })
    declare referencia_codigo: string | null;

    @AllowNull(true)
    @Column({
        type: DataType.JSONB
    })
    declare payload: object | null;

    @AllowNull(false)
    @Default("PENDIENTE")
    @Column({
        type: DataType.STRING(20)
    })
    declare estado: string; // PENDIENTE, EN_PROCESO, IMPRESO, ERROR, CANCELADO

    @AllowNull(false)
    @Default(0)
    @Column({
        type: DataType.SMALLINT
    })
    declare intentos: number;

    @AllowNull(false)
    @Default(3)
    @Column({
        type: DataType.SMALLINT
    })
    declare max_intentos: number;

    @AllowNull(true)
    @Column({
        type: DataType.TEXT
    })
    declare ultimo_error: string | null;

    @AllowNull(false)
    @Default(DataType.NOW)
    @Column({
        type: DataType.DATE
    })
    declare fecha_solicitud: Date;

    @AllowNull(true)
    @Column({
        type: DataType.DATE
    })
    declare fecha_tomado: Date | null;

    @AllowNull(true)
    @Column({
        type: DataType.DATE
    })
    declare fecha_impreso: Date | null;

    @AllowNull(true)
    @Column({
        type: DataType.UUID
    })
    declare solicitado_por: string | null;

    @AllowNull(true)
    @Column({
        type: DataType.STRING(100)
    })
    declare tomado_por_agente: string | null;

    @AllowNull(false)
    @Default(false)
    @Column({
        type: DataType.BOOLEAN
    })
    declare es_reimpresion: boolean;

    @BelongsTo(() => Impresora)
    declare impresora: Impresora;
}

export default Trabajo_Impresion;
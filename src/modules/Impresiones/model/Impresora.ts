import {
    Column,
    Model,
    DataType,
    Table,
    PrimaryKey,
    Default,
    AllowNull
} from "sequelize-typescript";

import { v4 as uuidv4 } from "uuid";

@Table({
    tableName: "impresora",
    timestamps: true
})
class Impresora extends Model {

    @PrimaryKey
    @Default(uuidv4)
    @Column({
        type: DataType.UUID
    })
    declare id_impresora: string;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(100)
    })
    declare nombre_impresora: string;

    @AllowNull(false)
    @Column({
        type: DataType.STRING(30)
    })
    declare tipo_impresora: string; // TERMICA, LASER, ETIQUETA

    @AllowNull(false)
    @Column({
        type: DataType.STRING(30)
    })
    declare modo_conexion: string; // USB, RED, WINDOWS

    @AllowNull(true)
    @Column({
        type: DataType.STRING(255)
    })
    declare direccion_impresora: string | null;

    @AllowNull(true)
    @Column({
        type: DataType.STRING(255)
    })
    declare nombre_sistema: string | null;

    @AllowNull(true)
    @Column({
        type: DataType.UUID
    })
    declare id_sucursal: string | null;

    @AllowNull(true)
    @Column({
        type: DataType.STRING(100)
    })
    declare estacion: string | null;

    @AllowNull(false)
    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare activa: boolean;

    @AllowNull(true)
    @Column({
        type: DataType.JSONB
    })
    declare configuracion: object | null;
}

export default Impresora;
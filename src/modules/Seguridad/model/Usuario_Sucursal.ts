import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, Default } from "sequelize-typescript";
import Usuario from "./Usuario";// tu usuario real
import Empresa_Sucursal from "../../../models/Empresa_Sucursal/Empresa_Sucursal";

@Table({ tableName: "usuario_empresa" })
export default class Usuario_Empresa extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_usuario_empresa: string;

    @ForeignKey(() => Usuario)
    @Column(DataType.UUID)
    declare id_user: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare status_acceso: boolean;

    @BelongsTo(() => Usuario)
    declare usuario?: Usuario;

    @BelongsTo(() => Empresa_Sucursal)
    declare empresa?: Empresa_Sucursal;
}

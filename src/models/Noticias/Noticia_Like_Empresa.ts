import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo,
    Unique
} from "sequelize-typescript";
import Noticia from "./Noticia";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";

@Table({ tableName: "noticia_like_empresa", timestamps: false })
export default class Noticia_Like_Empresa extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_like_empresa: string;

    @ForeignKey(() => Noticia)
    @Unique("like_unico")
    @Column(DataType.UUID)
    declare id_noticia: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Unique("like_unico")
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @Default(DataType.NOW)
    @Column(DataType.DATE)
    declare fecha_like: Date;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare activo: boolean;

    @BelongsTo(() => Noticia)
    Noticia: Noticia;

    @BelongsTo(() => Empresa_Sucursal)
    EmpresaSucursal: Empresa_Sucursal;
}

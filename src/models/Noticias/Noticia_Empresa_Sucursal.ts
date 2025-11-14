import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo
} from "sequelize-typescript";
import Noticia from "./Noticia";
import Empresa_Sucursal from "../Empresa_Sucursal/Empresa_Sucursal";

@Table({ tableName: "noticia_empresa_sucursal", timestamps: false })
export default class Noticia_Empresa_Sucursal extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_noticia_empresa: string;

    @ForeignKey(() => Noticia)
    @Column(DataType.UUID)
    declare id_noticia: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empresa_sucursal: string;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare visible: boolean;

    @BelongsTo(() => Noticia)
    Noticia: Noticia;

    @BelongsTo(() => Empresa_Sucursal)
    EmpresaSucursal: Empresa_Sucursal;
}

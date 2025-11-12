import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    Default,
    ForeignKey,
    BelongsTo,
    HasMany
} from "sequelize-typescript";
import Categoria_Noticia from "./Categoria_Noticia";
import Departamento from "./Departamento";
import Noticia_Empresa_Sucursal from "./Noticia_Empresa_Sucursal";
import Noticia_Like_Empresa from "./Noticia_Like_Empresa";

@Table({ tableName: "noticia" })
export default class Noticia extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_noticia: string;

    @Column({
        type: DataType.STRING(255),
        allowNull: false
    })
    declare titulo_noticia: string;

    @Column(DataType.STRING(255))
    declare subtitulo_noticia: string;

    @ForeignKey(() => Categoria_Noticia)
    @Column(DataType.SMALLINT)
    declare categoria_noticia: number;

    @Column(DataType.TEXT)
    declare contenido_noticia: string;

    @Column(DataType.STRING(500))
    declare imagen_portada: string;

    @ForeignKey(() => Departamento)
    @Column(DataType.SMALLINT)
    declare departamento_noticia: number;

    @Column(DataType.DATE)
    declare fecha_inicio_visible: Date;

    @Column(DataType.DATE)
    declare fecha_expiracion: Date;

    @Default(0)
    @Column(DataType.INTEGER)
    declare likes_noticia: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare activo: boolean;

    // Relaciones
    @BelongsTo(() => Categoria_Noticia)
    Categoria: Categoria_Noticia;

    @BelongsTo(() => Departamento)
    Departamento: Departamento;

    @HasMany(() => Noticia_Empresa_Sucursal)
    NoticiasEmpresas: Noticia_Empresa_Sucursal[];

    @HasMany(() => Noticia_Like_Empresa)
    LikesEmpresas: Noticia_Like_Empresa[];
}

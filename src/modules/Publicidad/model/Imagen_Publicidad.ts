import { Table, Column, Model, DataType, PrimaryKey, ForeignKey, BelongsTo, Default } from 'sequelize-typescript';
import Empresa_Sucursal from '../../../models/Empresa_Sucursal/Empresa_Sucursal';

@Table({ tableName: 'imagen_publicidad', timestamps: true })
class Imagen_Publicidad extends Model {
    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column(DataType.UUID)
    declare id_imagen: string;

    @ForeignKey(() => Empresa_Sucursal)
    @Column(DataType.UUID)
    declare id_empre: string;
    @BelongsTo(() => Empresa_Sucursal)
    declare empresa: Empresa_Sucursal;

    @Column(DataType.STRING(200))
    declare titulo: string | null;

    @Column(DataType.STRING(300))
    declare ruta_imagen: string;

    @Default(0)
    @Column(DataType.INTEGER)
    declare orden: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare activa: boolean;
}

export default Imagen_Publicidad;

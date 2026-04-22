import { Table, Column, Model, PrimaryKey, DataType, ForeignKey, BelongsTo } from "sequelize-typescript";
import Usuario from "./Usuario";
import Permiso from "./Permiso";

@Table({ tableName: 'permiso_usuario' })
class Permiso_Usuario extends Model {

    @PrimaryKey
    @Column({ type: DataType.UUID })
    declare id_permiso_usuario: string;

    @ForeignKey(() => Usuario)
    @Column({ type: DataType.UUID })
    declare id_user: string;
    @BelongsTo(() => Usuario)
    declare usuario: Usuario;

    @ForeignKey(() => Permiso)
    @Column({ type: DataType.SMALLINT })
    declare id_permiso: number;
    @BelongsTo(() => Permiso)
    declare permiso: Permiso;

    // 'grant' = dar acceso aunque el rol no lo tenga
    // 'deny'  = quitar acceso aunque el rol sí lo tenga
    @Column({ type: DataType.STRING(10) })
    declare tipo_override: 'grant' | 'deny';
}

export default Permiso_Usuario;

import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
} from 'sequelize-typescript';
import Cuenta_Por_Cobrar from './Cuenta_Por_Cobrar.model';
import Empleado from '../../../RRHH/model/Empleado';

// Notas de seguimiento de cobranza sobre una cuenta por cobrar (quién, cuándo y qué dijo).
@Table({
    tableName: 'comentario_cxc',
    timestamps: true,
    updatedAt: false,
})
class Comentario_CxC extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare id_comentario_cxc: string;

    @ForeignKey(() => Cuenta_Por_Cobrar)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_cxc: string;

    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare id_empleado: string | null;

    // Nombre al momento de comentar, para que el historial se lea igual aunque cambie el empleado
    @Column({
        type: DataType.STRING(150),
        allowNull: false
    })
    declare nombre_autor: string;

    @Column({
        type: DataType.TEXT,
        allowNull: false
    })
    declare texto: string;

    @BelongsTo(() => Cuenta_Por_Cobrar)
    declare cuenta?: Cuenta_Por_Cobrar;
}

export default Comentario_CxC;

import { Table, Column, Model, DataType, PrimaryKey, Default, AllowNull, ForeignKey, BelongsTo } from 'sequelize-typescript';
import Ciudad from '../Ubicacion/Ciudad';

@Table({
    tableName: 'empleado',
    timestamps: false,
})
class Empleado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4,
    })
    declare id_empleado: string;

    @Column({
        type: DataType.SMALLINT,
    })
    declare numcontint_empleado: number;

    @Column({
        type: DataType.STRING(40),
    })
    declare nomb_empleado: string;

    @Column({
        type: DataType.STRING(40),
    })
    declare apepat_empleado: string;

    @Column({
        type: DataType.STRING(40),
    })
    declare apemat_empleado: string;

    @Column({
        type: DataType.STRING(12),
    })
    declare numcel_empleado: string;

    @Column({
        type: DataType.STRING(18),
    })
    declare curp_empleado: string;

    @Column({
        type: DataType.STRING(15),
    })
    declare rfc_empleado: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
    })
    declare sueldo_empleado: number;

    @ForeignKey(() => Ciudad) // si tienes un modelo de Ciudad
    @Column({
        type: DataType.SMALLINT,
    })
    declare idciudad_empleado: number;

    @Column({
        type: DataType.STRING(20),
    })
    declare nss_empleado: string;

    @BelongsTo(() => Ciudad)
    declare ciudad: Ciudad
}

export default Empleado;
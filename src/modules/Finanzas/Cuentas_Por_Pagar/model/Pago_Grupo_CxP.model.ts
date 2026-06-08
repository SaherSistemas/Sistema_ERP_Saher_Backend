import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, Default, BelongsTo, HasMany,
} from 'sequelize-typescript';
import Empleado from '../../../RRHH/model/Empleado';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Pago_CxP from './Pago_CxP.model';

@Table({ tableName: 'pago_grupo_cxp', timestamps: false })
class Pago_Grupo_CxP extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_pago_grupo: string;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare fecha_pago: Date;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({ type: DataType.CHAR(2), allowNull: true })
    declare id_forma_pago: string | null;

    @Column({ type: DataType.STRING(100), allowNull: true })
    declare referencia_pago: string | null;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare monto_total: number;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null;

    @Column({ type: DataType.STRING(500), allowNull: true })
    declare url_comprobante: string | null;

    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_captura: string | null;

    @Column({ type: DataType.DATE, allowNull: true, defaultValue: DataType.NOW })
    declare created_at: Date;

    // ── Relaciones ───────────────────────────────────────────────────────────
    @BelongsTo(() => Cat_Forma_De_Pago, 'id_forma_pago')
    declare forma_pago: Cat_Forma_De_Pago;

    @BelongsTo(() => Empleado, 'id_empleado_captura')
    declare empleado: Empleado;

    @HasMany(() => Pago_CxP, 'id_pago_grupo')
    declare pagos: Pago_CxP[];
}

export default Pago_Grupo_CxP;

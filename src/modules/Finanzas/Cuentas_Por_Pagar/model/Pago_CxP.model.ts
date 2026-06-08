import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, Default, BelongsTo,
} from 'sequelize-typescript';
import Cuenta_Por_Pagar from './Cuenta_Por_Pagar.model';
import Empleado from '../../../RRHH/model/Empleado';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Pago_Grupo_CxP from './Pago_Grupo_CxP.model';

/*
 ESTATUS PAGO
 APL → Aplicado
 CAN → Cancelado
*/

@Table({ tableName: 'pago_cxp', timestamps: false })
class Pago_CxP extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_pago_cxp: string;

    @ForeignKey(() => Cuenta_Por_Pagar)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_cxp: string;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare monto_pago: number;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare fecha_pago: Date;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({ type: DataType.CHAR(2), allowNull: true })
    declare id_forma_pago: string | null;

    @Column({ type: DataType.STRING(100), allowNull: true })
    declare referencia_pago: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null;

    @Column({ type: DataType.STRING(500), allowNull: true })
    declare url_comprobante: string | null;   // ruta local del archivo subido

    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_captura: string | null;

    @Column({ type: DataType.CHAR(3), allowNull: false, defaultValue: 'APL' })
    declare estatus_pago: string;

    @ForeignKey(() => Pago_Grupo_CxP)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_pago_grupo: string | null;

    @Column({ type: DataType.DATE, allowNull: true, defaultValue: DataType.NOW })
    declare created_at: Date;

    // ── Relaciones ──────────────────────────────────────────────────────────────
    @BelongsTo(() => Cuenta_Por_Pagar, 'id_cxp')
    declare cxp: Cuenta_Por_Pagar;

    @BelongsTo(() => Pago_Grupo_CxP, 'id_pago_grupo')
    declare pago_grupo: Pago_Grupo_CxP;

    @BelongsTo(() => Cat_Forma_De_Pago, 'id_forma_pago')
    declare forma_pago: Cat_Forma_De_Pago;

    @BelongsTo(() => Empleado, 'id_empleado_captura')
    declare empleado: Empleado;
}

export default Pago_CxP;

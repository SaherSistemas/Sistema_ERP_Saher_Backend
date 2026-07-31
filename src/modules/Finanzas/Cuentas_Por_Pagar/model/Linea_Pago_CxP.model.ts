import {
    Table, Column, Model, DataType,
    PrimaryKey, ForeignKey, Default, BelongsTo,
} from 'sequelize-typescript';
import Cuenta_Por_Pagar from './Cuenta_Por_Pagar.model';
import Proveedor from '../../../Compras/Proveedores/model/Proveedor';
import Empleado from '../../../RRHH/model/Empleado';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';

/*
 ESTADO
 PEN → Pendiente  (generada, aún no registrada como pago)
 REG → Registrada (ya se convirtió en un pago real)
 CAN → Cancelada
*/

@Table({ tableName: 'linea_pago_cxp', timestamps: true, underscored: false })
class Linea_Pago_CxP extends Model {

    @PrimaryKey
    @Default(DataType.UUIDV4)
    @Column({ type: DataType.UUID })
    declare id_linea_pago: string;

    @ForeignKey(() => Cuenta_Por_Pagar)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_cxp: string;

    @ForeignKey(() => Proveedor)
    @Column({ type: DataType.UUID, allowNull: false })
    declare id_proveedor: string;

    @Column({ type: DataType.DECIMAL(12, 2), allowNull: false })
    declare monto: number;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare fecha_pago: Date;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({ type: DataType.CHAR(2), allowNull: true })
    declare id_forma_pago: string | null;

    @Column({ type: DataType.STRING(100), allowNull: true })
    declare referencia: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare notas: string | null;

    @Column({ type: DataType.TEXT, allowNull: true })
    declare url_comprobante: string | null;

    @Default('PEN')
    @Column({ type: DataType.CHAR(3), allowNull: false })
    declare estado: string;

    @ForeignKey(() => Empleado)
    @Column({ type: DataType.UUID, allowNull: true })
    declare id_empleado_genera: string | null;

    // ── Relaciones ──────────────────────────────────────────────────────────────
    @BelongsTo(() => Cuenta_Por_Pagar, 'id_cxp')
    declare cxp: Cuenta_Por_Pagar;

    @BelongsTo(() => Proveedor, 'id_proveedor')
    declare proveedor: Proveedor;

    @BelongsTo(() => Cat_Forma_De_Pago, 'id_forma_pago')
    declare forma_pago: Cat_Forma_De_Pago;

    @BelongsTo(() => Empleado, 'id_empleado_genera')
    declare empleado_genera: Empleado;
}

export default Linea_Pago_CxP;

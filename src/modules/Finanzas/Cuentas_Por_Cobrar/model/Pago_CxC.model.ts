import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    ForeignKey,
    BelongsTo,
    Default
} from 'sequelize-typescript';
import Cuenta_Por_Cobrar from './Cuenta_Por_Cobrar.model';
import Cat_Metodo_Pago from '../../../Catalogos/model/Cat_Metodo_Pago';
import Cat_Forma_De_Pago from '../../../Catalogos/model/Cat_Forma_De_Pago';
import Empleado from '../../../RRHH/model/Empleado';

/*
    ESTATUS PAGO
    CAP → Capturado  (registrado, pendiente de que el encargado lo aplique)
    APL → Aplicado   (aprobado por el encargado → actualiza CxC + timbra CFDI)
    CAN → Cancelado
*/

@Table({
    tableName: 'pago_cxc'
})
class Pago_CxC extends Model {

    @PrimaryKey
    @Column({
        type: DataType.UUID,
        defaultValue: DataType.UUIDV4
    })
    declare id_pago_cxc: string;

    @ForeignKey(() => Cuenta_Por_Cobrar)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_cxc: string;

    @ForeignKey(() => Cat_Metodo_Pago)
    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    declare id_metodo_pago: string;

    @ForeignKey(() => Cat_Forma_De_Pago)
    @Column({
        type: DataType.CHAR(2),
        allowNull: false
    })
    declare id_forma_pago: string;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare monto_pago: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare fecha_pago: Date;

    @Column({
        type: DataType.STRING(100),
        allowNull: true
    })
    declare referencia_pago: string;

    // Quién capturó el pago
    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: false
    })
    declare id_empleado_captura: string;

    // Quién aplicó el pago (lo llena el encargado de pagos al aplicar)
    @ForeignKey(() => Empleado)
    @Column({
        type: DataType.UUID,
        allowNull: true
    })
    declare id_empleado_aplica: string;

    // Fecha en que fue aplicado
    @Column({
        type: DataType.DATE,
        allowNull: true
    })
    declare fecha_aplicado: Date;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare notas: string;

    //! CAP = Capturado | APL = Aplicado | CAN = Cancelado
    @Default('CAP')
    @Column({
        type: DataType.CHAR(3),
        allowNull: false
    })
    declare estatus_pago: string;

    // =====================
    //      RELACIONES
    // =====================

    @BelongsTo(() => Cuenta_Por_Cobrar)
    cuenta_por_cobrar: Cuenta_Por_Cobrar;

    @BelongsTo(() => Cat_Metodo_Pago)
    metodo_pago: Cat_Metodo_Pago;

    @BelongsTo(() => Cat_Forma_De_Pago)
    forma_pago: Cat_Forma_De_Pago;

    @BelongsTo(() => Empleado, { foreignKey: 'id_empleado_captura' })
    empleado_captura: Empleado;

    @BelongsTo(() => Empleado, { foreignKey: 'id_empleado_aplica' })
    empleado_aplica: Empleado;
}

export default Pago_CxC;

import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, AllowNull } from 'sequelize-typescript';
import Cat_Regimen_Fiscal from '../Catalogos/Cat_Regimen_Fiscal';
import Cat_Tipo_Contrato from '../Catalogos/Cat_Tipo_Contrato';
import Cat_Tipo_Jornada from '../Catalogos/Cat_Tipo_Jornada';
import Cat_Riesgo_Puesto from '../Catalogos/Cat_Riesgo_Puesto';
import Cat_Periodicidad_Pago from '../Catalogos/Cat_Periodicidad_Pago';
import Cat_Bancos from '../Catalogos/Cat_Bancos';
import Ciudad from '../Ubicacion/Ciudad';

@Table({
    tableName: 'empleado'
})
class Empleado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_empleado: string;

    @Column({
        type: DataType.STRING(40)
    })
    declare nombre_empleado: string;

    @Column({
        type: DataType.STRING(40)
    })
    declare ap_pat_empleado: string;

    @Column({
        type: DataType.STRING(40)
    })
    declare ap_mat_empleado: string;

    @Column({
        type: DataType.STRING(13)
    })
    declare rfc_empleado: string;

    @Column({
        type: DataType.STRING(18)
    })
    declare curp_empleado: string;

    @Column({
        type: DataType.STRING(100)
    })
    declare direccion_empleado: string;

    @Column({
        type: DataType.STRING(12)
    })
    declare nss_empleado: string;

    @ForeignKey(() => Cat_Regimen_Fiscal)
    @Column({
        type: DataType.STRING(3)
    })
    declare regimen_fiscal_empleado: string;

    @Column({
        type: DataType.STRING(30)
    })
    declare correo_empleado: string;

    @ForeignKey(() => Ciudad)
    @Column({
        type: DataType.SMALLINT
    })
    declare id_ciudad_empleado: number;

    @Column({
        type: DataType.DATE
    })
    declare fechanacimiento_empleado: Date;


    @ForeignKey(() => Cat_Tipo_Contrato)
    @Column({
        type: DataType.STRING(2)
    })
    declare tipocontrato_empleado: string;

    @ForeignKey(() => Cat_Tipo_Jornada)
    @Column({
        type: DataType.STRING(2)
    })
    declare tipojornada_empleado: string;

    @Column({
        type: DataType.STRING(2)
    })
    declare departamento_empleado: string;

    @ForeignKey(() => Cat_Riesgo_Puesto)
    @Column({
        type: DataType.STRING(1)
    })
    declare riesgo_empleado: string;

    @ForeignKey(() => Cat_Periodicidad_Pago)
    @Column({
        type: DataType.STRING(2)
    })
    declare periodicidadpago_empleado: string;

    @ForeignKey(() => Cat_Bancos)
    @Column({
        type: DataType.STRING(2)
    })
    declare ctabanco_empleado: string;

    @Column({
        type: DataType.STRING(18)
    })
    declare cuenta_bancaria: string;
    @Column({
        type: DataType.STRING(18)
    })
    declare clabe_interbancaria: string;

    @Column({
        type: DataType.DECIMAL(10, 2)
    })
    declare salario_base_cot_apor: number;
    @Column({
        type: DataType.DECIMAL(10, 2)
    })
    declare salario_diario_integrado: number;

    @Default(true)
    @Column({
        type: DataType.BOOLEAN
    })
    declare estatus_empleado: boolean;
}

export default Empleado;

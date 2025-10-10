import { Table, Column, Model, DataType, PrimaryKey, Default, ForeignKey, AllowNull, BelongsTo, Unique } from 'sequelize-typescript';
import Cat_Regimen_Fiscal from '../../Catalogos/Cat_Regimen_Fiscal';
import Cat_Tipo_Contrato from '../../Catalogos/Cat_Tipo_Contrato';
import Cat_Tipo_Jornada from '../../Catalogos/Cat_Tipo_Jornada';
import Cat_Riesgo_Puesto from '../../Catalogos/Cat_Riesgo_Puesto';
import Cat_Periodicidad_Pago from '../../Catalogos/Cat_Periodicidad_Pago';
import Cat_Bancos from '../../Catalogos/Cat_Bancos';
import Ciudad from '../../Ubicacion/Ciudad';
import Empresa from '../../Empresa_Sucursal/Empresa_Sucursal';

@Table({
    tableName: 'empleado'
})
class Empleado extends Model {
    @PrimaryKey
    @Column({
        type: DataType.UUID
    })
    declare id_empleado: string;

    @Unique
    @Column({
        type: DataType.INTEGER
    })
    declare idinterno_empleado: number;

    @ForeignKey(() => Empresa)
    @Column({
        type: DataType.UUID
    })
    declare idempresa_empleado: string;
    @BelongsTo(() => Empresa)
    declare empresa?: Empresa;


    @Column(DataType.STRING(40))
    declare nombre_empleado: string;

    @Column(DataType.STRING(40))
    declare ap_pat_empleado: string;

    @Column(DataType.STRING(40))
    declare ap_mat_empleado: string;

    @Column(DataType.STRING(13))
    declare rfc_empleado: string;

    @Column(DataType.STRING(18))
    declare curp_empleado: string;

    @Column(DataType.STRING(100))
    declare direccion_empleado: string;

    @Column(DataType.STRING(5))
    declare codigo_postal_empleado: string;

    @Column(DataType.STRING(12))
    declare nss_empleado: string;

    @Column(DataType.DATE)
    @Column(DataType.DATEONLY)
    declare fecha_inicio_rel_laboral: Date;

    @ForeignKey(() => Cat_Regimen_Fiscal)
    @Column(DataType.STRING(3))
    declare regimen_fiscal_empleado: string;
    @BelongsTo(() => Cat_Regimen_Fiscal)
    declare regimenFiscal?: Cat_Regimen_Fiscal;

    @Column(DataType.STRING(30))
    declare correo_empleado: string;

    @ForeignKey(() => Ciudad)
    @Column(DataType.UUID)
    declare id_ciudad_empleado: string;
    @BelongsTo(() => Ciudad)
    declare ciudad?: Ciudad;


    @Column(DataType.DATEONLY)
    declare fechanacimiento_empleado: Date;

    @ForeignKey(() => Cat_Tipo_Contrato)
    @Column(DataType.STRING(2))
    declare tipocontrato_empleado: string;
    @BelongsTo(() => Cat_Tipo_Contrato)
    declare tipoContrato?: Cat_Tipo_Contrato;

    @ForeignKey(() => Cat_Tipo_Jornada)
    @Column(DataType.STRING(2))
    declare tipojornada_empleado: string;
    @BelongsTo(() => Cat_Tipo_Jornada)
    declare tipoJornada?: Cat_Tipo_Jornada;

    @Column(DataType.STRING(20))
    declare departamento_empleado: string;

    @Column(DataType.STRING(40))
    declare puesto_empleado: string;

    @ForeignKey(() => Cat_Riesgo_Puesto)
    @Column(DataType.STRING(1))
    declare riesgo_empleado: string;
    @BelongsTo(() => Cat_Riesgo_Puesto)
    declare riesgoPuesto?: Cat_Riesgo_Puesto;

    @ForeignKey(() => Cat_Periodicidad_Pago)
    @Column(DataType.STRING(2))
    declare periodicidadpago_empleado: string;
    @BelongsTo(() => Cat_Periodicidad_Pago)
    declare periodicidadPago?: Cat_Periodicidad_Pago;

    @ForeignKey(() => Cat_Bancos)
    @Column(DataType.STRING(3))
    declare ctabanco_empleado: string;
    @BelongsTo(() => Cat_Bancos)
    declare banco?: Cat_Bancos;

    @Column(DataType.STRING(18))
    declare cuenta_bancaria: string;

    @Column(DataType.STRING(18))
    declare clabe_interbancaria: string;

    @Column(DataType.DECIMAL(10, 2))
    declare salario_diario_integrado: number;

    @Default(true)
    @Column(DataType.BOOLEAN)
    declare estatus_empleado: boolean;
}

export default Empleado;

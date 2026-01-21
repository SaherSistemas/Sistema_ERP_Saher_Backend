import Cat_Bancos from "../../Catalogos/model/Cat_Bancos";
import Cat_Periodicidad_Pago from "../../Catalogos/model/Cat_Periodicidad_Pago";
import Cat_Regimen_Fiscal from "../../Catalogos/model/Cat_Regimen_Fiscal";
import Cat_Riesgo_Puesto from "../../Catalogos/model/Cat_Riesgo_Puesto";
import Cat_Tipo_Contrato from "../../Catalogos/model/Cat_Tipo_Contrato";
import Cat_Tipo_Jornada from "../../Catalogos/model/Cat_Tipo_Jornada";
import Empresa_Sucursal from "../../../models/Empresa_Sucursal/Empresa_Sucursal";
import Ciudad from "../../../models/Ubicacion/Ciudad";

export interface IEmpleado {
    id_empleado: string;
    idinterno_empleado: number;
    id_sucursal_empleado: string;
    nombre_empleado: string;
    ap_pat_empleado: string;
    ap_mat_empleado: string;
    rfc_empleado: string;
    curp_empleado: string;
    direccion_empleado: string;
    codigo_postal_empleado: string;
    nss_empleado: string;
    fecha_inicio_rel_laboral: Date;
    regimen_fiscal_empleado: string;
    regimenFiscal?: Cat_Regimen_Fiscal;
    correo_empleado: string;
    id_ciudad_empleado: string;
    fechanacimiento_empleado: Date;
    tipoContrato?: Cat_Tipo_Contrato;
    tipoJornada?: Cat_Tipo_Jornada;
    departamento_empleado: string;
    puesto_empleado: string;
    riesgoPuesto?: Cat_Riesgo_Puesto;
    periodicidadPago?: Cat_Periodicidad_Pago;
    banco?: Cat_Bancos;
    cuenta_bancaria: string;
    clabe_interbancaria: string;
    salario_diario_integrado: number;
    estatus_empleado: boolean;

    asignacionSucursal?: Empresa_Sucursal;
}



// Interface para crear un nuevo empleado
export interface ICrearEmpleado {
    idinterno_empleado: number;
    id_sucursal_empleado: string;
    nombre_empleado: string;
    ap_pat_empleado: string;
    ap_mat_empleado: string;
    rfc_empleado: string;
    curp_empleado: string;
    direccion_empleado: string;
    codigo_postal_empleado: string;
    nss_empleado: string;
    fecha_inicio_rel_laboral: Date;
    regimen_fiscal_empleado: string;
    correo_empleado: string;
    id_ciudad_empleado: string;
    fechanacimiento_empleado: Date;
    tipocontrato_empleado: string;
    tipojornada_empleado: string;
    departamento_empleado: string;
    puesto_empleado: string;
    riesgo_empleado: string;
    periodicidadpago_empleado: string;
    ctabanco_empleado: string;
    cuenta_bancaria: string;
    clabe_interbancaria: string;
    salario_diario_integrado: number;
    estatus_empleado?: boolean;
}

// Interface para actualizar un empleado
export interface IUpdateEmpleado {
    idinterno_empleado?: number;
    id_sucursal_empleado?: string;
    nombre_empleado?: string;
    ap_pat_empleado?: string;
    ap_mat_empleado?: string;
    rfc_empleado?: string;
    curp_empleado?: string;
    direccion_empleado?: string;
    codigo_postal_empleado?: string;
    nss_empleado?: string;
    fecha_inicio_rel_laboral?: Date;
    regimen_fiscal_empleado?: string;
    correo_empleado?: string;
    id_ciudad_empleado?: string;
    fechanacimiento_empleado?: Date;
    tipocontrato_empleado?: string;
    tipojornada_empleado?: string;
    departamento_empleado?: string;
    puesto_empleado?: string;
    riesgo_empleado?: string;
    periodicidadpago_empleado?: string;
    ctabanco_empleado?: string;
    cuenta_bancaria?: string;
    clabe_interbancaria?: string;
    salario_diario_integrado?: number;
    estatus_empleado?: boolean;
}
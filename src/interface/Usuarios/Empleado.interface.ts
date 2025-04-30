import Cat_Bancos from "../../models/Catalogos/Cat_Bancos";
import Cat_Periodicidad_Pago from "../../models/Catalogos/Cat_Periodicidad_Pago";
import Cat_Regimen_Fiscal from "../../models/Catalogos/Cat_Regimen_Fiscal";
import Cat_Riesgo_Puesto from "../../models/Catalogos/Cat_Riesgo_Puesto";
import Cat_Tipo_Contrato from "../../models/Catalogos/Cat_Tipo_Contrato";
import Cat_Tipo_Jornada from "../../models/Catalogos/Cat_Tipo_Jornada";
import Empresa_Sucursal from "../../models/Empresa_Sucursal/Empresa_Sucursal";
import Ciudad from "../../models/Ubicacion/Ciudad";

export interface IEmpleado {
    id_empleado: string;              // ID único del empleado
    idinterno_empleado: number;       // ID Interno único del empleado
    idempresa_empleado: string;       // ID de la empresa
    empresa?: Empresa_Sucursal;      // Relación con la empresa
    nombre_empleado: string;          // Nombre del empleado
    ap_pat_empleado: string;          // Apellido paterno
    ap_mat_empleado: string;          // Apellido materno
    rfc_empleado: string;             // RFC del empleado
    curp_empleado: string;            // CURP del empleado
    direccion_empleado: string;      // Dirección del empleado
    codigo_postal_empleado: string;  // Código postal del empleado
    nss_empleado: string;            // Número de seguridad social
    fecha_inicio_rel_laboral: Date;  // Fecha de inicio de la relación laboral
    regimen_fiscal_empleado: string; // Régimen fiscal
    regimenFiscal?: Cat_Regimen_Fiscal; // Detalle del régimen fiscal
    correo_empleado: string;         // Correo electrónico
    id_ciudad_empleado: string;      // ID de la ciudad
    ciudad?: Ciudad;                 // Relación con la ciudad
    fechanacimiento_empleado: Date;  // Fecha de nacimiento
    tipocontrato_empleado: string;   // Tipo de contrato
    tipoContrato?: Cat_Tipo_Contrato; // Detalle del tipo de contrato
    tipojornada_empleado: string;    // Tipo de jornada
    tipoJornada?: Cat_Tipo_Jornada;  // Detalle del tipo de jornada
    departamento_empleado: string;   // Departamento
    puesto_empleado: string;         // Puesto
    riesgo_empleado: string;         // Riesgo del puesto
    riesgoPuesto?: Cat_Riesgo_Puesto; // Detalle del riesgo del puesto
    periodicidadpago_empleado: string; // Periodicidad del pago
    periodicidadPago?: Cat_Periodicidad_Pago; // Detalle de la periodicidad del pago
    ctabanco_empleado: string;       // Clave del banco
    banco?: Cat_Bancos;              // Relación con el banco
    cuenta_bancaria: string;         // Número de cuenta bancaria
    clabe_interbancaria: string;     // CLABE interbancaria
    salario_diario_integrado: number; // Salario diario integrado
    estatus_empleado: boolean;       // Estatus del empleado (activo/inactivo)
}

// Interface para crear un nuevo empleado
export interface ICrearEmpleado {
    idempresa_empleado: string;
    nombre_empleado: string;           // Nombre del empleado
    ap_pat_empleado: string;           // Apellido paterno
    ap_mat_empleado: string;           // Apellido materno
    rfc_empleado: string;              // RFC del empleado
    curp_empleado: string;             // CURP del empleado
    direccion_empleado: string;       // Dirección del empleado
    codigo_postal_empleado: string;   // Código postal del empleado
    nss_empleado: string;             // Número de seguridad social
    fecha_inicio_rel_laboral: Date;   // Fecha de inicio de la relación laboral
    regimen_fiscal_empleado: string;  // Régimen fiscal del empleado
    correo_empleado: string;          // Correo electrónico
    id_ciudad_empleado: string;       // ID de la ciudad
    fechanacimiento_empleado: Date;   // Fecha de nacimiento
    tipocontrato_empleado: string;    // Tipo de contrato
    tipojornada_empleado: string;     // Tipo de jornada
    departamento_empleado: string;    // Departamento
    puesto_empleado: string;          // Puesto
    riesgo_empleado: string;          // Riesgo del puesto
    periodicidadpago_empleado: string; // Periodicidad del pago
    ctabanco_empleado: string;        // Clave del banco
    cuenta_bancaria: string;          // Número de cuenta bancaria
    clabe_interbancaria: string;      // CLABE interbancaria
    salario_diario_integrado: number; // Salario diario integrado
    estatus_empleado?: boolean;       // Estatus (activo/inactivo), por defecto true
}

// Interface para actualizar un empleado
export interface IUpdateEmpleado {
    idinterno_empleado?: number;        // ID Interno único del empleado (opcional)
    idempresa_empleado?: string;        // ID de la empresa (opcional)
    nombre_empleado?: string;           // Nombre del empleado (opcional)
    ap_pat_empleado?: string;           // Apellido paterno (opcional)
    ap_mat_empleado?: string;           // Apellido materno (opcional)
    rfc_empleado?: string;              // RFC del empleado (opcional)
    curp_empleado?: string;             // CURP del empleado (opcional)
    direccion_empleado?: string;       // Dirección del empleado (opcional)
    codigo_postal_empleado?: string;   // Código postal del empleado (opcional)
    nss_empleado?: string;             // Número de seguridad social (opcional)
    fecha_inicio_rel_laboral?: Date;   // Fecha de inicio de la relación laboral (opcional)
    regimen_fiscal_empleado?: string;  // Régimen fiscal (opcional)
    correo_empleado?: string;          // Correo electrónico (opcional)
    id_ciudad_empleado?: string;       // ID de la ciudad (opcional)
    fechanacimiento_empleado?: Date;   // Fecha de nacimiento (opcional)
    tipocontrato_empleado?: string;    // Tipo de contrato (opcional)
    tipojornada_empleado?: string;     // Tipo de jornada (opcional)
    departamento_empleado?: string;    // Departamento (opcional)
    puesto_empleado?: string;          // Puesto (opcional)
    riesgo_empleado?: string;          // Riesgo del puesto (opcional)
    periodicidadpago_empleado?: string; // Periodicidad del pago (opcional)
    ctabanco_empleado?: string;        // Clave del banco (opcional)
    cuenta_bancaria?: string;          // Número de cuenta bancaria (opcional)
    clabe_interbancaria?: string;      // CLABE interbancaria (opcional)
    salario_diario_integrado?: number; // Salario diario integrado (opcional)
    estatus_empleado?: boolean;       // Estatus del empleado (opcional)
}
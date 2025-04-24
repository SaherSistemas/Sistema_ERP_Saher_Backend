export interface IEmpleado {
    id_empleado: string;
    idinterno_empleado: number;
    nombre_empleado: string;
    ap_pat_empleado: string;
    ap_mat_empleado: string;
    rfc_empleado: string;
    curp_empleado: string;
    direccion_empleado: string;
    nss_empleado: string;
    regimen_fiscal_empleado: string;
    correo_empleado: string;
    id_ciudad_empleado: number;
    fechanacimiento_empleado: Date;
    tipocontrato_empleado: string;
    tipojornada_empleado: string;
    departamento_empleado: string;
    riesgo_empleado: string;
    periodicidadpago_empleado: string;
    ctabanco_empleado: string;
    cuenta_bancaria: string;
    clabe_interbancaria: string;
    salario_base_cot_apor: number;
    salario_diario_integrado: number;
    estatus_empleado: boolean;
}

export interface ICrearEmpleado {
    nombre_empleado: string;
    ap_pat_empleado: string;
    ap_mat_empleado: string;
    rfc_empleado: string;
    curp_empleado: string;
    direccion_empleado: string;
    nss_empleado: string;
    regimen_fiscal_empleado: string;
    correo_empleado: string;
    id_ciudad_empleado: number;
    fechanacimiento_empleado: Date;
    tipocontrato_empleado: string;
    tipojornada_empleado: string;
    departamento_empleado: string;
    riesgo_empleado: string;
    periodicidadpago_empleado: string;
    ctabanco_empleado: string;
    cuenta_bancaria: string;
    clabe_interbancaria: string;
    salario_base_cot_apor: number;
    salario_diario_integrado: number;
    estatus_empleado?: boolean; // opcional, por si quieres que sea true por default
}

export interface ITipo_IVA {
    id_iva: number;
    descripcion_iva: string;         // Ej: "IVA 16%"
    porcentaje_iva: number;          // Ej: 16.00
    tasa_cuota: string;              // Ej: "0.160000"
    tipo_factor: 'Tasa' | 'Cuota' | 'Exento';
    impuesto_sat: '001' | '002' | '003'; // 002 = IVA
}

export interface ICreateOrUpdateTipo_IVA {
    descripcion_iva?: string;
    porcentaje_iva?: number;
    tasa_cuota?: string;
    tipo_factor?: 'Tasa' | 'Cuota' | 'Exento';
    impuesto_sat?: '001' | '002' | '003';
}

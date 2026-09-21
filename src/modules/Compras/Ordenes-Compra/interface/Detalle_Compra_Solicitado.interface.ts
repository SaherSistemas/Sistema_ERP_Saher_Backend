export interface IDetalle_Compra_Solicitado {
    id_detcompsol: string
    idcomp_detcompsol: string
    idarticulo_detcompsol: string
    cantidad_detcompsol: number
    precio_detcompsol: number
    total?: number; // <-- AGREGADO
}

export interface ICreateOrUpdateDetalleCompraSolicitado {
    idarticulo_detcompsol: string
    cantidad_detcompsol: number
    precio_detcompsol: number
}


export interface ICreateOAcumularDetallesSolicitados {
    id_compra: string
    detalles: ICreateOrUpdateDetalleCompraSolicitado[]
    reemplazar?: boolean;
    /** Empleado que captura (token) */
    id_empleado?: string | null;
    /** Con reemplazar: cantidad que la pantalla creía que había (0 = nada). Si difiere de la real, hay conflicto. */
    cantidad_esperada?: number;
    /** Omite la verificación de conflicto (el usuario confirmó reemplazar) */
    forzar?: boolean;
}

/** Otra persona cambió la línea mientras esta pantalla la tenía abierta */
export class ConflictoCapturaError extends Error {
    status = 409;
    code = 'CONFLICTO_CAPTURA';
    constructor(public actual: number, public capturista: string | null) {
        super('Otra persona modificó este artículo.');
    }
}
export interface IQRConfig {
    datos: string;
    tamano: number;
    correccion: 'L' | 'M' | 'Q' | 'H';
    alineacion: 'izquierda' | 'centro' | 'derecha';
}

export interface IPayload {
    tipo: string;
    qr?: IQRConfig;
    comandos?: any[];
    pdf_url?: string | null;
    ruta_archivo?: string | null;
}

export interface ICreateTrabajoImpresion {
    cod_interno_pedido: string;
    id_impresora: string;
    tipo_documento: string;
    payload: IPayload;
}
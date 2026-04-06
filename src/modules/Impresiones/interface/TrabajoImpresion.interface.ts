export interface IQRConfig {
    datos: string;
    tamano: number;
    correccion: 'L' | 'M' | 'Q' | 'H';
    alineacion: 'izquierda' | 'centro' | 'derecha';
}

export interface IPayload {
    tipo: string;
    qr?: IQRConfig;
    comandos?: any[]; // Aquí podrías definir una interfaz más específica para los comandos de impresión
}

export interface ICreateTrabajoImpresion {
    cod_interno_pedido: string;
    id_impresora: string;
    tipo_documento: string;
    payload: IPayload;
}
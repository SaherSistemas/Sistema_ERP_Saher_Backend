export interface ICrearBultoPayload {
    id_pedido_empaque: string;
    cod_bulto?: string;
    tipo_bulto: 'CAJA' | 'BOLSA';
    num_bulto: number;
    total_bulto: number;
    escaneado?: boolean;
}
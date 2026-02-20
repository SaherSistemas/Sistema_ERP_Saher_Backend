/*Get → es consulta
ResumenPromocion → lo que hace
Query → viene por query params
DTO → contrato de transporte
*/
export interface GetResumenPromocionQueryDTO {
    id_cliente: string;
    id_sucursal: string;
    grupoPrecio: string;
    page: number;
    limit: number;
}

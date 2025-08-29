export interface ICompraKPISRequest {
    from?: string;
    to?: string;
    estadoHijo?: string;
    q?: string;
}

export interface ICompraKPI {
    totalComprasGenerales: number;
    montoTotal: number;
    estados: {
        R: number; // Recibidas
        A: number; // En acomodo
        F: number; // Finalizadas
        D: number; // Con devolución
    };
}

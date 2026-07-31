/** Devuelve la clave que identifica el periodo de un reto para el progreso */
export function calcularPeriodoRef(
    periodo: string,
    id_corte: string,
    fecha_dia: string,
    fecha_especifica?: string | null
): string {
    const fecha = new Date(fecha_dia + 'T12:00:00');

    switch (periodo) {
        case 'CORTE':
            return id_corte;

        case 'DIA':
            return fecha_dia;

        case 'SEMANA': {
            const tmp = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
            const diaSemana = tmp.getDay() === 0 ? 7 : tmp.getDay();
            tmp.setDate(tmp.getDate() + 4 - diaSemana);
            const inicioAnio = new Date(tmp.getFullYear(), 0, 1);
            const semana = Math.ceil(((tmp.getTime() - inicioAnio.getTime()) / 86400000 + 1) / 7);
            return `${tmp.getFullYear()}-W${String(semana).padStart(2, '0')}`;
        }

        case 'QUINCENAL': {
            const q = fecha.getDate() <= 15 ? 'Q1' : 'Q2';
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${q}`;
        }

        case 'MENSUAL':
            return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;

        case 'FECHA_ESPECIFICA':
            return fecha_especifica ?? fecha_dia;

        default:
            return fecha_dia;
    }
}

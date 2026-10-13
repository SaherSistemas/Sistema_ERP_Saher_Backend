import { QueryTypes } from 'sequelize';
import { dbPoly } from '../../config/db';
import Empresa_Sucursal from '../../models/Empresa_Sucursal/Empresa_Sucursal';

// Mismas farmacias que cuentan como "Farmacias (SVM)" en el historial del artículo
const FARMACIAS_SVM = [2, 3, 4, 5, 6, 7, 8, 14, 15, 16, 17, 18, 19, 21];

export interface VentaFarmacia {
    id: number;
    nombre: string;
    pz: number;
}

export interface PeriodoFarmacias {
    quincena: string;          // "YYYY-MM-DD a YYYY-MM-DD" (igual que el historial)
    total: number;
    farmacias: VentaFarmacia[];
}

const esFecha = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));

export const Proyeccion_FarmaciasService = {

    // Piezas que vendió CADA farmacia (SVM) de un artículo en los periodos indicados
    getSvmPorFarmacia: async (cod_int_artic: string, quincenas: string[]): Promise<PeriodoFarmacias[]> => {
        const articulo = Number(cod_int_artic);
        if (!Number.isFinite(articulo)) throw new Error('Artículo no válido.');

        const rangos = (quincenas ?? [])
            .slice(0, 12)
            .map(q => {
                const [ini, fin] = String(q).split(' a ').map(x => x.trim());
                return { quincena: String(q), ini, fin };
            })
            .filter(r => esFecha(r.ini) && esFecha(r.fin));
        if (!rangos.length) return [];

        const filas = await dbPoly.query<any>(`
            SELECT p.idx::int AS idx, m.empcdempn AS emp, COALESCE(SUM(m.kdxcantin), 0)::bigint AS pz
            FROM unnest(ARRAY[:inis]::date[], ARRAY[:fins]::date[]) WITH ORDINALITY AS p(ini, fin, idx)
            JOIN public.kardex m
              ON m.artcdartn = :articulo::int
             AND TRIM(UPPER(m.tmocdtpoc)) = 'SVM'
             AND m.empcdempn IN (:farmacias)
             AND m.kdxfechad::date BETWEEN p.ini AND p.fin
            GROUP BY p.idx, m.empcdempn
        `, {
            replacements: {
                inis: rangos.map(r => r.ini),
                fins: rangos.map(r => r.fin),
                articulo,
                farmacias: FARMACIAS_SVM,
            },
            type: QueryTypes.SELECT,
        }) as any[];

        // Nombre de cada farmacia: la sucursal del grupo que tiene ese código del sistema anterior
        const empresas = await Empresa_Sucursal.findAll({
            attributes: ['id_empresa_sys_anterior', 'nom_empre'],
            raw: true,
        }) as any[];
        const nombres = new Map<number, string>();
        for (const e of empresas) {
            const cod = Number(e.id_empresa_sys_anterior);
            if (Number.isFinite(cod) && e.nom_empre) nombres.set(cod, String(e.nom_empre).trim());
        }

        return rangos.map((r, i) => {
            const farmacias = filas
                .filter(f => Number(f.idx) === i + 1)
                .map(f => ({
                    id: Number(f.emp),
                    nombre: nombres.get(Number(f.emp)) ?? `Farmacia ${Number(f.emp)}`,
                    pz: Number(f.pz) || 0,
                }))
                .filter(f => f.pz !== 0)
                .sort((a, b) => b.pz - a.pz);
            return { quincena: r.quincena, total: farmacias.reduce((s, f) => s + f.pz, 0), farmacias };
        });
    },
};

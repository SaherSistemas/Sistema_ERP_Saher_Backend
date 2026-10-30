import { QueryTypes } from 'sequelize';
import { v4 as uuidv4 } from 'uuid';
import { dbLocal } from '../../../../config/db';

// Administración genérica de los catálogos (tablas cat_*): ver, agregar, editar y eliminar renglones.
// La estructura de cada tabla se lee de la base (information_schema), así que sirve para cualquier catálogo sin una pantalla
// por tabla. Seguridad: solo tablas que existan y empiecen con "cat_"; los nombres de tabla y columna salen de la base (nunca
// del texto recibido) y los valores van siempre como parámetros.

export interface ColumnaCatalogo {
    nombre: string;
    tipo: 'texto' | 'entero' | 'decimal' | 'booleano' | 'fecha' | 'otro';
    obligatorio: boolean;          // NOT NULL y sin valor por defecto: hay que capturarla al agregar
    largo: number | null;
    es_pk: boolean;
    automatica: boolean;           // la llena el sistema (createdAt / updatedAt)
}

const error = (status: number, message: string) => ({ status, message });
const AUTO = new Set(['createdat', 'updatedat', 'created_at', 'updated_at']);

const comillas = (n: string) => `"${n.replace(/"/g, '""')}"`;

async function tablasCatalogo(): Promise<string[]> {
    // OJO: con "SELECT table_name FROM ..." Sequelize regresa listas en vez de objetos (lo trata como consulta de tablas); por eso el alias
    const rows = await dbLocal.query<{ tabla: string }>(
        `SELECT t.table_name AS tabla FROM information_schema.tables t
         WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE' AND t.table_name LIKE 'cat\\_%'
         ORDER BY t.table_name`,
        { type: QueryTypes.SELECT });
    return rows.map(r => r.tabla);
}

async function validarTabla(tabla: string): Promise<string> {
    const t = String(tabla ?? '').trim();
    if (!(await tablasCatalogo()).includes(t)) throw error(404, 'Catálogo no encontrado.');
    return t;
}

async function esquema(tabla: string): Promise<{ columnas: ColumnaCatalogo[]; udt: Record<string, string> }> {
    const cols = await dbLocal.query<any>(
        `SELECT column_name, data_type, udt_name, is_nullable, column_default, character_maximum_length, is_identity
         FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = :t
         ORDER BY ordinal_position`,
        { replacements: { t: tabla }, type: QueryTypes.SELECT });
    const pks = await dbLocal.query<{ columna: string }>(
        `SELECT a.attname AS columna
         FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
         WHERE i.indrelid = ('public.' || quote_ident(:t))::regclass AND i.indisprimary`,
        { replacements: { t: tabla }, type: QueryTypes.SELECT });
    const esPk = new Set(pks.map(p => p.columna));

    const udt: Record<string, string> = {};
    const columnas: ColumnaCatalogo[] = cols.map((c: any) => {
        const dt = String(c.data_type);
        const tipo: ColumnaCatalogo['tipo'] =
            dt === 'boolean' ? 'booleano'
            : ['smallint', 'integer', 'bigint'].includes(dt) ? 'entero'
            : ['numeric', 'real', 'double precision', 'money'].includes(dt) ? 'decimal'
            : dt.startsWith('timestamp') || dt === 'date' ? 'fecha'
            : ['character varying', 'character', 'text', 'uuid'].includes(dt) ? 'texto'
            : 'otro';
        const nombre = String(c.column_name);
        udt[nombre] = String(c.udt_name);
        const tieneDefault = c.column_default !== null || c.is_identity === 'YES';
        return {
            nombre, tipo,
            obligatorio: c.is_nullable === 'NO' && !tieneDefault,
            largo: c.character_maximum_length ?? null,
            es_pk: esPk.has(nombre),
            automatica: AUTO.has(nombre.toLowerCase()) && tipo === 'fecha',
        };
    });
    return { columnas, udt };
}

// Convierte lo recibido al tipo de la columna (o lanza un error claro)
function normalizar(col: ColumnaCatalogo, valor: any): any {
    if (valor === undefined || valor === null || (typeof valor === 'string' && valor.trim() === '')) return null;
    switch (col.tipo) {
        case 'booleano':
            return valor === true || valor === 'true' || valor === 1 || valor === '1' || valor === 't';
        case 'entero': {
            const n = Number(valor);
            if (!Number.isInteger(n)) throw error(400, `"${col.nombre}" debe ser un número entero.`);
            return n;
        }
        case 'decimal': {
            const n = Number(valor);
            if (!Number.isFinite(n)) throw error(400, `"${col.nombre}" debe ser un número.`);
            return n;
        }
        default: {
            const t = String(valor).trim();
            if (col.largo && t.length > col.largo) throw error(400, `"${col.nombre}" admite máximo ${col.largo} caracteres.`);
            return t;
        }
    }
}

export const CatalogosAdminService = {

    // Todos los catálogos (tablas cat_*) con cuántos renglones tiene cada uno
    listarCatalogos: async () => {
        const tablas = await tablasCatalogo();
        const salida: { tabla: string; total: number }[] = [];
        for (const t of tablas) {
            const [r] = await dbLocal.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM ${comillas(t)}`, { type: QueryTypes.SELECT });
            salida.push({ tabla: t, total: Number(r?.n) || 0 });
        }
        return salida;
    },

    // Renglones de un catálogo, con su estructura (columnas), búsqueda y paginado
    listar: async (tabla: string, opts: { q?: string; page?: number; limit?: number }) => {
        const t = await validarTabla(tabla);
        const { columnas } = await esquema(t);
        const page = Math.max(1, Math.floor(opts.page ?? 1));
        const limit = Math.min(200, Math.max(5, Math.floor(opts.limit ?? 50)));
        const q = (opts.q ?? '').trim();

        const pks = columnas.filter(c => c.es_pk).map(c => c.nombre);
        const orden = (pks.length ? pks : [columnas[0].nombre]).map(comillas).join(', ');
        const where = q
            ? `WHERE ${columnas.map(c => `${comillas(c.nombre)}::text ILIKE :q`).join(' OR ')}`
            : '';
        const rep: Record<string, any> = { limit, offset: (page - 1) * limit };
        if (q) rep.q = `%${q}%`;

        const [{ total }] = await dbLocal.query<{ total: string }>(
            `SELECT COUNT(*)::text AS total FROM ${comillas(t)} ${where}`, { replacements: rep, type: QueryTypes.SELECT });
        const filas = await dbLocal.query<any>(
            `SELECT * FROM ${comillas(t)} ${where} ORDER BY ${orden} LIMIT :limit OFFSET :offset`,
            { replacements: rep, type: QueryTypes.SELECT });

        return { tabla: t, columnas, total: Number(total) || 0, page, limit, filas };
    },

    crear: async (tabla: string, datos: Record<string, any>) => {
        const t = await validarTabla(tabla);
        const { columnas, udt } = await esquema(t);
        const nombres: string[] = [];
        const marcas: string[] = [];
        const rep: Record<string, any> = {};

        columnas.forEach((c, i) => {
            if (c.automatica) { nombres.push(comillas(c.nombre)); marcas.push('NOW()'); return; }
            let valor = normalizar(c, datos?.[c.nombre]);
            // Llave UUID sin valor por defecto en la base: se genera aquí
            if (valor === null && c.es_pk && udt[c.nombre] === 'uuid' && c.obligatorio) valor = uuidv4();
            if (valor === null) {
                if (c.obligatorio) throw error(400, `Falta capturar "${c.nombre}".`);
                return;   // sin valor: la base usa su default o nulo
            }
            nombres.push(comillas(c.nombre));
            marcas.push(`:v${i}`);
            rep[`v${i}`] = valor;
        });
        if (nombres.length === 0) throw error(400, 'No hay datos que guardar.');

        try {
            const [fila] = await dbLocal.query<any>(
                `INSERT INTO ${comillas(t)} (${nombres.join(', ')}) VALUES (${marcas.join(', ')}) RETURNING *`,
                { replacements: rep, type: QueryTypes.SELECT });
            return fila;
        } catch (e: any) {
            throw mapearErrorBD(e, 'agregar');
        }
    },

    // pk = valores de la llave primaria del renglón (la llave no se edita)
    actualizar: async (tabla: string, pk: Record<string, any>, datos: Record<string, any>) => {
        const t = await validarTabla(tabla);
        const { columnas } = await esquema(t);
        const llaves = columnas.filter(c => c.es_pk);
        if (llaves.length === 0) throw error(400, 'Este catálogo no tiene llave primaria: no se puede editar desde aquí.');
        for (const k of llaves) if (pk?.[k.nombre] === undefined) throw error(400, `Falta la llave "${k.nombre}".`);

        const sets: string[] = [];
        const rep: Record<string, any> = {};
        columnas.forEach((c, i) => {
            if (c.es_pk) return;
            if (c.automatica) { if (c.nombre.toLowerCase().replace('_', '') === 'updatedat') sets.push(`${comillas(c.nombre)} = NOW()`); return; }
            if (datos?.[c.nombre] === undefined) return;
            const valor = normalizar(c, datos[c.nombre]);
            if (valor === null && c.obligatorio) throw error(400, `"${c.nombre}" no puede quedar vacío.`);
            sets.push(`${comillas(c.nombre)} = :v${i}`);
            rep[`v${i}`] = valor;
        });
        if (!sets.some(s => !s.endsWith('NOW()'))) throw error(400, 'No hay cambios que guardar.');

        const where = llaves.map((k, i) => { rep[`pk${i}`] = pk[k.nombre]; return `${comillas(k.nombre)} = :pk${i}`; }).join(' AND ');
        try {
            const [fila] = await dbLocal.query<any>(
                `UPDATE ${comillas(t)} SET ${sets.join(', ')} WHERE ${where} RETURNING *`,
                { replacements: rep, type: QueryTypes.SELECT });
            if (!fila) throw error(404, 'El renglón ya no existe.');
            return fila;
        } catch (e: any) {
            if (e?.status) throw e;
            throw mapearErrorBD(e, 'editar');
        }
    },

    eliminar: async (tabla: string, pk: Record<string, any>) => {
        const t = await validarTabla(tabla);
        const { columnas } = await esquema(t);
        const llaves = columnas.filter(c => c.es_pk);
        if (llaves.length === 0) throw error(400, 'Este catálogo no tiene llave primaria: no se puede eliminar desde aquí.');
        const rep: Record<string, any> = {};
        const where = llaves.map((k, i) => {
            if (pk?.[k.nombre] === undefined) throw error(400, `Falta la llave "${k.nombre}".`);
            rep[`pk${i}`] = pk[k.nombre];
            return `${comillas(k.nombre)} = :pk${i}`;
        }).join(' AND ');
        try {
            const filas = await dbLocal.query<any>(
                `DELETE FROM ${comillas(t)} WHERE ${where} RETURNING 1 AS ok`, { replacements: rep, type: QueryTypes.SELECT });
            if (filas.length === 0) throw error(404, 'El renglón ya no existe.');
            return { ok: true };
        } catch (e: any) {
            if (e?.status) throw e;
            throw mapearErrorBD(e, 'eliminar');
        }
    },
};

// Errores de la base en lenguaje claro (llave repetida, registro en uso…)
function mapearErrorBD(e: any, accion: string) {
    const code = e?.original?.code ?? e?.parent?.code;
    if (code === '23505') return error(409, 'Ya existe un renglón con esa clave.');
    if (code === '23503') {
        return error(409, accion === 'eliminar'
            ? 'No se puede eliminar: este renglón está en uso en otras tablas. Si el catálogo tiene la casilla "activo", desactívalo en lugar de borrarlo.'
            : 'El valor no es válido: hace referencia a algo que no existe.');
    }
    if (code === '23502') return error(400, 'Falta capturar un dato obligatorio.');
    if (code === '22001') return error(400, 'Un texto es demasiado largo para su campo.');
    if (code === '22P02' || code === '22003') return error(400, 'Un valor no tiene el formato correcto.');
    console.error(`[CatalogosAdmin] error al ${accion}:`, e?.message ?? e);
    return error(500, `No se pudo ${accion} el renglón.`);
}

// ---- Tipos base
type Path = string;

type Rule<S, TVal> =
    | Path
    | ((src: S) => TVal)
    | { from?: Path; map?: (val: any, src: S) => TVal; default?: any; const?: any };

export type MapConfig<S, T> = { [K in keyof T]?: Rule<S, T[K]> };

const get = (obj: any, path?: string) =>
    !path ? undefined : path.split('.').reduce((a, k) => (a == null ? a : a[k]), obj);

// ---- ✅ Acepta un 2do argumento opcional con autoCopy
export function makeMapper<S extends object, T extends object>(
    config: MapConfig<S, T>,
    opts: { autoCopy?: boolean } = {}
) {
    return (src: S): T => {
        const out: any = {};

        // Copia automática de campos con el mismo nombre
        if (opts.autoCopy) {
            for (const k of Object.keys(src as any)) {
                if (!(k in config)) out[k] = (src as any)[k];
            }
        }

        // Reglas explícitas
        for (const key in config) {
            const rule: any = (config as any)[key];
            if (typeof rule === 'string') { out[key] = get(src, rule); continue; }
            if (typeof rule === 'function') { out[key] = rule(src); continue; }
            if ('const' in rule) { out[key] = rule.const; continue; }

            const raw = rule.from ? get(src, rule.from) : (src as any)[key];
            out[key] = raw == null ? (rule.default ?? null) : (rule.map ? rule.map(raw, src) : raw);
        }

        return out as T;
    };
}

// mapear arrays con el mismo `opts`
export const mapArray = <S extends object, T extends object>(
    config: MapConfig<S, T>,
    items: S[],
    opts: { autoCopy?: boolean } = {}
) => items.map(makeMapper<S, T>(config, opts));

// Helpers
export const asNum = (x: any) => (x == null ? 0 : Number(x));
export const asISO = (x: any) => (x ? new Date(x).toISOString() : null);

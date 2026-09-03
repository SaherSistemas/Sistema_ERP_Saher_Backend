import Configuracion_Global from '../model/Configuracion_Global.model';

// Valores por defecto si la clave no existe en BD
const DEFAULTS: Record<string, { valor: string; tipo: 'boolean' | 'number' | 'string'; categoria: string; descripcion: string }> = {
    empaque_requiere_empleado: {
        valor: 'false',
        tipo: 'boolean',
        categoria: 'empaque',
        descripcion: 'Solicitar número de empleado al finalizar el empaque de un pedido',
    },
};

export class ConfiguracionService {

    static async getAll(): Promise<Configuracion_Global[]> {
        return Configuracion_Global.findAll({ order: [['categoria', 'ASC'], ['clave', 'ASC']] });
    }

    static async getByClave(clave: string): Promise<{ clave: string; valor: string; tipo: string }> {
        const config = await Configuracion_Global.findOne({ where: { clave } });
        if (config) return { clave: config.clave, valor: config.valor, tipo: config.tipo };

        const def = DEFAULTS[clave];
        if (def) return { clave, valor: def.valor, tipo: def.tipo };

        throw new Error(`Configuración '${clave}' no encontrada`);
    }

    static async create(data: {
        clave: string;
        valor: string;
        tipo: 'boolean' | 'number' | 'string';
        categoria: string;
        descripcion?: string;
    }): Promise<Configuracion_Global> {
        const existe = await Configuracion_Global.findOne({ where: { clave: data.clave } });
        if (existe) throw new Error(`La clave '${data.clave}' ya existe`);
        return Configuracion_Global.create({ ...data, descripcion: data.descripcion ?? null });
    }

    static async delete(clave: string): Promise<void> {
        const rows = await Configuracion_Global.destroy({ where: { clave } });
        if (!rows) throw new Error(`Configuración '${clave}' no encontrada`);
    }

    static async upsert(clave: string, valor: string): Promise<Configuracion_Global> {
        const def = DEFAULTS[clave];
        const [config] = await Configuracion_Global.upsert({
            clave,
            valor,
            tipo:        def?.tipo        ?? 'string',
            categoria:   def?.categoria   ?? 'general',
            descripcion: def?.descripcion ?? null,
        });
        return config;
    }

    // Inicializa las claves por defecto si no existen
    static async seedDefaults(): Promise<void> {
        for (const [clave, def] of Object.entries(DEFAULTS)) {
            const existe = await Configuracion_Global.findOne({ where: { clave } });
            if (!existe) {
                await Configuracion_Global.create({ clave, ...def });
            }
        }
    }
}

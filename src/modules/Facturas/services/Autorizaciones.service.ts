import { Op } from 'sequelize';
import { dbLocal } from '../../../config/db';
import { io } from '../../../server_ws';
import { JwtPayloadCustom } from '../../../middleware/auth';
import Solicitud_Autorizacion from '../model/Solicitud_Autorizacion.model';
import Pedido_Almacen from '../../Almacen/Pedido/model/Pedido_Almacen';
import Detalle_Pedido_Almacen from '../../Almacen/Pedido/model/Detalle_Pedido_Almacen';
import Cliente_Almacen from '../../../models/Clientes/Cliente_Almacen/Cliente_Almacen';
import { Pedido_AlmacenService } from '../../Almacen/Pedido/services/Pedido_Almacen.service';
import { SALA_ADMINS_AUTORIZACION } from '../helpers/autorizacion.helper';
import { verificarAdmin } from './Facturacion.service';

// Hoy solo se autorizan cambios de precio (el crédito excedido se sigue autorizando con usuario y
// contraseña de administrador en la pantalla de facturar).
export type TipoAutorizacion = 'PRECIOS';

export class AutorizacionError extends Error {
    constructor(public status: number, message: string) { super(message); }
}

const HORAS_PENDIENTE = 24;   // una solicitud sin atender más de un día ya no se muestra

const r2 = (n: number) => +n.toFixed(2);

const sala = (id: string) => `autorizacion:${id}`;

// ── "Quién la está revisando" ─────────────────────────────────────────────────
// Un administrador que abre la solicitud la "toma": a los demás les aparece su nombre. Vive en memoria
// (no necesita tabla) y se renueva con un latido mientras la pantalla siga abierta; si se cierra la
// app o se cae la red, se libera sola a los 3 minutos.
const MS_REVISION = 3 * 60 * 1000;
const revisiones = new Map<string, { nombre: string; id_user: string; timer: NodeJS.Timeout }>();

function soltarRevision(id: string, avisar = true) {
    const r = revisiones.get(id);
    if (!r) return;
    clearTimeout(r.timer);
    revisiones.delete(id);
    if (avisar) io.to(SALA_ADMINS_AUTORIZACION).emit('autorizacion_revisando', { id_solicitud_autorizacion: id, revisando_por: null, revisando_id_user: null });
}

function plano(s: Solicitud_Autorizacion) {
    const p = (s as any).toJSON ? (s as any).toJSON() : s;
    const r = revisiones.get(s.id_solicitud_autorizacion);
    return { ...p, revisando_por: r?.nombre ?? null, revisando_id_user: r?.id_user ?? null };
}

// ── Precios: líneas con precio mayor al capturado (misma regla que la pestaña "Cambios de Precio") ──
async function calcularCambiosPrecio(id_pedido_alm: string) {
    const lineas = await Pedido_AlmacenService.getCambiosPrecioChequeo(id_pedido_alm) as any[];
    if (!lineas.length) throw new AutorizacionError(409, 'El pedido no tiene cambios de precio por autorizar.');

    const detalle = lineas.map(l => ({
        id_detalle_pedido_almacen: l.id_detalle_pedido_almacen as string,
        des_artic: String(l.des_artic ?? ''),
        cant_pedida: Number(l.cant_pedida),
        precio_pedido: Number(l.precio_pedido),
        precio_actual: Number(l.precio_actual),
        diferencia: Number(l.diferencia),
    }));
    const anterior = detalle.reduce((s, l) => s + l.cant_pedida * l.precio_pedido, 0);
    const nuevo = detalle.reduce((s, l) => s + l.cant_pedida * l.precio_actual, 0);
    return { lineas: detalle, totales: { anterior: r2(anterior), nuevo: r2(nuevo), diferencia: r2(nuevo - anterior) } };
}

function nombreDe(user?: Partial<JwtPayloadCustom> | null): string {
    return (user?.nombre_completo || user?.username || '').toString().slice(0, 150);
}

function avisarResuelta(s: Solicitud_Autorizacion) {
    soltarRevision(s.id_solicitud_autorizacion, false);
    const payload = plano(s);
    io.to(sala(s.id_solicitud_autorizacion)).emit('autorizacion_resuelta', payload);
    io.to(SALA_ADMINS_AUTORIZACION).emit('autorizacion_resuelta', payload);
}

export const AutorizacionesService = {

    // Crea la solicitud (o actualiza la pendiente del mismo pedido, para no duplicar alertas).
    // Con usuario_admin + password_admin se autoriza/rechaza en el acto desde la app de escritorio.
    crear: async (p: {
        tipo: TipoAutorizacion;
        id_pedido_alm: string;
        user?: JwtPayloadCustom;
        id_empleado?: string | null;
        credenciales?: { usuario_admin: string; password_admin: string; accion: 'AUTORIZAR' | 'RECHAZAR' };
    }) => {
        if (p.tipo !== 'PRECIOS') throw new AutorizacionError(400, 'Tipo de autorización inválido.');

        // Credenciales primero: si están mal, no se crea nada
        const autorizador = p.credenciales
            ? await verificarAdmin(p.credenciales.usuario_admin, p.credenciales.password_admin)
            : null;

        const pedido = await Pedido_Almacen.findByPk(p.id_pedido_alm, {
            attributes: ['id_pedido_alm', 'cod_int_pedido_alm', 'status_pedido_alm', 'fecha_facturado_pedido_alm', 'id_cliente_pedido_alm'],
        }) as any;
        if (!pedido) throw new AutorizacionError(404, 'Pedido no encontrado.');
        if (pedido.fecha_facturado_pedido_alm || pedido.status_pedido_alm === 'FA') {
            throw new AutorizacionError(409, 'Este pedido ya fue facturado.');
        }

        const id_cliente_alm: string | null = pedido.id_cliente_pedido_alm ?? null;
        const datos = await calcularCambiosPrecio(p.id_pedido_alm);
        const cli = id_cliente_alm
            ? await Cliente_Almacen.findByPk(id_cliente_alm, { attributes: ['razon_social_cliente_alm', 'nom_corto_cliente_alm'] }) as any
            : null;
        const cliente_nombre: string | null = cli ? (cli.razon_social_cliente_alm || cli.nom_corto_cliente_alm || null) : null;

        let solicitud = await Solicitud_Autorizacion.findOne({
            where: { id_pedido_alm: p.id_pedido_alm, tipo: p.tipo, estatus: 'PEN' },
            order: [['createdAt', 'DESC']],
        });

        if (solicitud) {
            await solicitud.update({
                datos, id_cliente_alm, cliente_nombre,
                solicita_nombre: nombreDe(p.user) || solicitud.solicita_nombre,
                id_empleado_solicita: p.id_empleado || solicitud.id_empleado_solicita,
            });
        } else {
            solicitud = await Solicitud_Autorizacion.create({
                tipo: p.tipo,
                estatus: 'PEN',
                id_pedido_alm: p.id_pedido_alm,
                cod_pedido: pedido.cod_int_pedido_alm,
                id_cliente_alm, cliente_nombre, datos,
                solicita_nombre: nombreDe(p.user) || null,
                id_empleado_solicita: p.id_empleado || null,
            } as any);
            io.to(SALA_ADMINS_AUTORIZACION).emit('autorizacion_nueva', plano(solicitud));
        }

        if (autorizador && p.credenciales) {
            return AutorizacionesService._resolver(solicitud, p.credenciales.accion, {
                nombre: autorizador.usuario, id_user: autorizador.id_user, via: 'ESCRITORIO',
            });
        }
        return plano(solicitud);
    },

    listarPendientes: async () => {
        const desde = new Date(Date.now() - HORAS_PENDIENTE * 3600 * 1000);
        const filas = await Solicitud_Autorizacion.findAll({
            where: { estatus: 'PEN', createdAt: { [Op.gte]: desde } },
            order: [['createdAt', 'ASC']],
        });
        return filas.map(plano);
    },

    obtener: async (id: string) => {
        const s = await Solicitud_Autorizacion.findByPk(id);
        if (!s) throw new AutorizacionError(404, 'Solicitud no encontrada.');
        return plano(s);
    },

    // El administrador abre la solicitud: queda "revisando". Si otro ya la tiene, se respeta su nombre
    // (la persona puede verla igual). Llamarlo de nuevo cada ~minuto renueva el latido.
    revisar: async (id: string, user: JwtPayloadCustom) => {
        const s = await Solicitud_Autorizacion.findByPk(id);
        if (!s) throw new AutorizacionError(404, 'Solicitud no encontrada.');
        if (s.estatus !== 'PEN') return plano(s);

        const actual = revisiones.get(id);
        if (actual && actual.id_user !== user.id_user) return plano(s);

        if (actual) clearTimeout(actual.timer);
        const timer = setTimeout(() => soltarRevision(id), MS_REVISION);
        revisiones.set(id, { nombre: nombreDe(user) || 'Un administrador', id_user: user.id_user, timer });
        if (!actual) {
            io.to(SALA_ADMINS_AUTORIZACION).emit('autorizacion_revisando', {
                id_solicitud_autorizacion: id, revisando_por: nombreDe(user) || 'Un administrador', revisando_id_user: user.id_user,
            });
        }
        return plano(s);
    },

    // Cierra la pantalla sin resolver: solo la libera quien la tenía
    liberarRevision: async (id: string, user: JwtPayloadCustom) => {
        const r = revisiones.get(id);
        if (r && r.id_user === user.id_user) soltarRevision(id);
        return { ok: true };
    },

    // Un administrador con su sesión (web / escritorio) autoriza o rechaza
    resolverConSesion: async (id: string, accion: 'AUTORIZAR' | 'RECHAZAR', user: JwtPayloadCustom, motivo?: string) => {
        const s = await Solicitud_Autorizacion.findByPk(id);
        if (!s) throw new AutorizacionError(404, 'Solicitud no encontrada.');
        return AutorizacionesService._resolver(s, accion, {
            nombre: nombreDe(user), id_user: user.id_user ?? null, via: 'WEB', motivo,
        });
    },

    _resolver: async (
        s: Solicitud_Autorizacion,
        accion: 'AUTORIZAR' | 'RECHAZAR',
        quien: { nombre: string; id_user: string | null; via: 'WEB' | 'ESCRITORIO'; motivo?: string },
    ) => {
        if (!['AUTORIZAR', 'RECHAZAR'].includes(accion)) throw new AutorizacionError(400, 'Acción inválida.');
        if (s.estatus !== 'PEN') {
            const ya = s.estatus === 'AUT' || s.estatus === 'USA' ? 'autorizada' : s.estatus === 'REC' ? 'rechazada' : 'cancelada';
            throw new AutorizacionError(409, `Esta solicitud ya fue ${ya}${s.resuelto_por ? ` por ${s.resuelto_por}` : ''}.`);
        }

        const autoriza = accion === 'AUTORIZAR';

        // Cambio de precio autorizado: se actualiza precio_venta de esas líneas (solo antes de facturar).
        // La remisión/CxC se crean después, al facturar, con estos precios.
        if (autoriza) {
            const pedido = await Pedido_Almacen.findByPk(s.id_pedido_alm, {
                attributes: ['id_pedido_alm', 'status_pedido_alm', 'fecha_facturado_pedido_alm'],
            }) as any;
            if (!pedido || pedido.fecha_facturado_pedido_alm || pedido.status_pedido_alm === 'FA') {
                throw new AutorizacionError(409, 'El pedido ya fue facturado: no se pueden cambiar sus precios.');
            }
            const lineas: any[] = s.datos?.lineas ?? [];
            const t = await dbLocal.transaction();
            try {
                for (const l of lineas) {
                    await Detalle_Pedido_Almacen.update(
                        { precio_venta: l.precio_actual },
                        { where: { id_detalle_pedido_almacen: l.id_detalle_pedido_almacen, id_pedido_almacen: s.id_pedido_alm, es_oferta: false }, transaction: t },
                    );
                }
                await t.commit();
            } catch (err) {
                await t.rollback();
                throw err;
            }
            console.log(`[Autorizaciones] ${quien.nombre} autorizó los nuevos precios del pedido ${s.cod_pedido} (${lineas.length} líneas)`);
        }

        await s.update({
            estatus: autoriza ? 'AUT' : 'REC',
            resuelto_por: quien.nombre || null,
            id_usuario_resuelve: quien.id_user,
            resuelto_via: quien.via,
            motivo_resolucion: quien.motivo?.trim().slice(0, 500) || null,
            fecha_resolucion: new Date(),
        });
        avisarResuelta(s);
        return plano(s);
    },

    // Quien pidió la autorización la retira (cerró el modal, ya no la necesita)
    cancelar: async (id: string) => {
        const s = await Solicitud_Autorizacion.findByPk(id);
        if (!s) throw new AutorizacionError(404, 'Solicitud no encontrada.');
        if (s.estatus !== 'PEN') return plano(s);
        await s.update({ estatus: 'CAN', fecha_resolucion: new Date() });
        avisarResuelta(s);
        return plano(s);
    },
};

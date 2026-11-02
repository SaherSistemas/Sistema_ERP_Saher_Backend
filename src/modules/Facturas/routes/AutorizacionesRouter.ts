import { Router, Response } from 'express';
import { authMiddleware, AuthedRequest } from '../../../middleware/auth';
import { AutorizacionesService, AutorizacionError } from '../services/Autorizaciones.service';
import { esAdminToken } from '../helpers/autorizacion.helper';

const router = Router();
router.use(authMiddleware);

function responderError(res: Response, e: any, etiqueta: string) {
    if (e instanceof AutorizacionError) { res.status(e.status).json({ message: e.message }); return; }
    const msg: string = e?.message ?? 'Error desconocido';
    // verificarAdmin() lanza Error con estos textos cuando el usuario/contraseña no sirven
    if (msg.startsWith('Credenciales de administrador') || msg.startsWith('El usuario no tiene permisos')) {
        res.status(403).json({ message: msg });
        return;
    }
    console.error(`[Autorizaciones] ${etiqueta}`, e);
    res.status(500).json({ message: msg });
}

// POST /autorizaciones  body: { tipo: 'PRECIOS', id_pedido_alm,
//                               usuario_admin?, password_admin?, accion?: 'AUTORIZAR' | 'RECHAZAR' }
// Lo llama el checador. Sin credenciales queda PENDIENTE y le llega la alerta a los administradores (web).
// Con usuario y contraseña de administrador se resuelve en el acto desde la app de escritorio.
router.post('/', async (req: AuthedRequest, res: Response) => {
    try {
        const { tipo, id_pedido_alm, usuario_admin, password_admin, accion } = req.body ?? {};
        if (!id_pedido_alm) { res.status(400).json({ message: 'id_pedido_alm es requerido.' }); return; }

        const credenciales = usuario_admin && password_admin
            ? { usuario_admin: String(usuario_admin), password_admin: String(password_admin), accion: (accion === 'RECHAZAR' ? 'RECHAZAR' : 'AUTORIZAR') as 'AUTORIZAR' | 'RECHAZAR' }
            : undefined;

        const r = await AutorizacionesService.crear({
            tipo, id_pedido_alm,
            user: req.user,
            id_empleado: req.user?.id_referencia_persona ?? null,
            credenciales,
        });
        res.status(201).json(r);
    } catch (e: any) {
        responderError(res, e, 'crear');
    }
});

// GET /autorizaciones/pendientes — solo administradores (la web lo usa para la campana de alertas)
router.get('/pendientes', async (req: AuthedRequest, res: Response) => {
    if (!esAdminToken(req.user)) { res.status(403).json({ message: 'Solo un administrador puede ver las solicitudes.' }); return; }
    try {
        res.json(await AutorizacionesService.listarPendientes());
    } catch (e: any) {
        responderError(res, e, 'pendientes');
    }
});

// GET /autorizaciones/:id — estado de una solicitud (el escritorio lo consulta mientras espera)
router.get('/:id', async (req: AuthedRequest, res: Response) => {
    try {
        res.json(await AutorizacionesService.obtener(req.params.id));
    } catch (e: any) {
        responderError(res, e, 'obtener');
    }
});

// PATCH /autorizaciones/:id/resolver  body: { accion: 'AUTORIZAR' | 'RECHAZAR', motivo? } — solo administradores
router.patch('/:id/resolver', async (req: AuthedRequest, res: Response) => {
    if (!esAdminToken(req.user)) { res.status(403).json({ message: 'Solo un administrador puede autorizar o rechazar.' }); return; }
    try {
        const { accion, motivo } = req.body ?? {};
        res.json(await AutorizacionesService.resolverConSesion(req.params.id, accion, req.user!, motivo));
    } catch (e: any) {
        responderError(res, e, 'resolver');
    }
});

// POST /autorizaciones/:id/revisar — el administrador abre la solicitud (los demás ven que la está revisando).
// Se vuelve a llamar cada ~minuto mientras siga abierta. DELETE la libera al cerrarla sin resolver.
router.post('/:id/revisar', async (req: AuthedRequest, res: Response) => {
    if (!esAdminToken(req.user)) { res.status(403).json({ message: 'Solo un administrador puede revisar solicitudes.' }); return; }
    try {
        res.json(await AutorizacionesService.revisar(req.params.id, req.user!));
    } catch (e: any) {
        responderError(res, e, 'revisar');
    }
});
router.delete('/:id/revisar', async (req: AuthedRequest, res: Response) => {
    try {
        res.json(await AutorizacionesService.liberarRevision(req.params.id, req.user!));
    } catch (e: any) {
        responderError(res, e, 'liberar');
    }
});

// PATCH /autorizaciones/:id/cancelar — quien la pidió la retira
router.patch('/:id/cancelar', async (req: AuthedRequest, res: Response) => {
    try {
        res.json(await AutorizacionesService.cancelar(req.params.id));
    } catch (e: any) {
        responderError(res, e, 'cancelar');
    }
});

export default router;

// Sala de socket.io a la que se unen los administradores conectados desde la web para recibir
// las solicitudes de autorización (crédito excedido / cambio de precio) en tiempo real.
export const SALA_ADMINS_AUTORIZACION = 'autorizaciones_admin';

const MASTER_ID = '00000000-0000-0000-0000-000000000000';

// Administrador = rol con prioridad <= 2 (igual que el resto del sistema) o el usuario maestro del .env.
export function esAdminToken(user?: { id_user?: string; prioridad?: number | null } | null): boolean {
    if (!user) return false;
    if (user.id_user === MASTER_ID) return true;
    return user.prioridad != null && Number(user.prioridad) <= 2;
}

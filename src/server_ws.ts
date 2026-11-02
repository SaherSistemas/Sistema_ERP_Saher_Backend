import http from 'http';
import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import app from './server';
import { SALA_ADMINS_AUTORIZACION, esAdminToken } from './modules/Facturas/helpers/autorizacion.helper';

const server_ws = http.createServer(app);

export const io = new Server(server_ws, {
    cors: { origin: '*' }
});

io.on('connection', (socket) => {
    console.log('Socket conectado:', socket.id);

    // Administradores (web) con su token: reciben en vivo las solicitudes de autorización (crédito / precios)
    const token = socket.handshake.auth?.token;
    if (token) {
        try {
            const user = jwt.verify(String(token), process.env.JWT_SECRET as string) as any;
            if (esAdminToken(user)) socket.join(SALA_ADMINS_AUTORIZACION);
        } catch { /* token vencido o inválido: se conecta como cualquier socket, sin alertas */ }
    }

    // Quien pidió una autorización (escritorio) escucha la respuesta de esa solicitud
    socket.on('join_autorizacion', (id_solicitud: string) => {
        if (id_solicitud) socket.join(`autorizacion:${id_solicitud}`);
    });
    socket.on('leave_autorizacion', (id_solicitud: string) => {
        if (id_solicitud) socket.leave(`autorizacion:${id_solicitud}`);
    });

    // Surtidor se une al room del inventario que está contando
    socket.on('join_inventario', async (id_inventario: string) => {
        socket.join(`inventario:${id_inventario}`);
        const room = io.sockets.adapter.rooms.get(`inventario:${id_inventario}`);
        io.to(`inventario:${id_inventario}`).emit('inventario_users', room?.size ?? 1);
        console.log(`Socket ${socket.id} se unió al inventario ${id_inventario}`);
    });

    socket.on('leave_inventario', async (id_inventario: string) => {
        socket.leave(`inventario:${id_inventario}`);
        const room = io.sockets.adapter.rooms.get(`inventario:${id_inventario}`);
        io.to(`inventario:${id_inventario}`).emit('inventario_users', room?.size ?? 0);
    });

    socket.on('disconnect', () => {
        console.log('Socket desconectado:', socket.id);
    });
});

export default server_ws;

import http from 'http';
import { Server } from 'socket.io';
import app from './server';

const server_ws = http.createServer(app);

export const io = new Server(server_ws, {
    cors: { origin: '*' }
});

io.on('connection', (socket) => {
    console.log('Socket conectado:', socket.id);

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

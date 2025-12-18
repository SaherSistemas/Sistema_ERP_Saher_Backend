import http from 'http';
import { Server } from 'socket.io';
import app from './server';

const server_ws = http.createServer(app);

export const io = new Server(server_ws, {
    cors: { origin: '*' } // Ajusta al frontend real
});
io.on('connection', (socket) => {
    console.log('Socket conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Socket desconectado:', socket.id);
    });
});

export default server_ws; // exportas el server_ws para que index.ts haga listen

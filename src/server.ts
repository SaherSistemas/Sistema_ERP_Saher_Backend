import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import cors from 'cors';
import { dbLocal, /*dbVieja/* dbRemota */ } from './config/db'; // Ambas conexiones
import router from './routes';

async function connectDatabases() {
    try {
        await dbLocal.authenticate();
        // await dbVieja.authenticate();
        // await dbRemota.authenticate();

        console.log(colors.blue.bold('Conexión exitosa a base LOCAL'));
        console.log(colors.green.bold('Conexión exitosa a base VIEJA'));

        await dbLocal.sync({ alter: true });    // Sincroniza modelos si es necesario
        //await dbRemota.sync();   // Solo si quieres sincronizar también la remota
    } catch (error) {
        console.error(colors.red.bold('Error al conectar a las bases de datos:'));
        console.error(error);
        process.exit(1);
    }
}

connectDatabases(); // ⬅ Aquí las conecta ambas

const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', router);

export default app;

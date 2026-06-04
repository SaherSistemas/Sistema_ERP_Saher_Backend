import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import cors from 'cors';
import { dbLocal, /*dbPoly, /*dbVieja/* dbRemota */ } from './config/db'; // Ambas conexiones
import router from './routes';
import fs from 'fs';
import path from 'path';

async function connectDatabases() {
    try {
        await dbLocal.authenticate();
        //  await dbPoly.authenticate(); PRUBEA CONEXION POLY
        // await dbVieja.authenticate();
        // await dbRemota.authenticate();

        console.log(colors.blue.bold('Conexión exitosa a base LOCAL'));
        console.log(colors.green.bold('Conexión exitosa a base VIEJA'));
        console.log(colors.yellow.bold('Conexión exitosa a base POLY'));

        //  await runMigrations();
        await dbLocal.sync({ alter: true });
        //await seedPermisosMenu();
        //await dbLocal.sync();    // Sincroniza modelos si es necesario
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

app.use('/uploads/firmas', express.static(
    path.join(__dirname, 'modules/Almacen/Empaque/routes/firmas')
));
export default app;

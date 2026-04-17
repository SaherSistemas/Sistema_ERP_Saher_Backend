import express from 'express';
import colors from 'colors';
import morgan from 'morgan';
import cors from 'cors';
import { dbLocal, /*dbVieja/* dbRemota */ } from './config/db'; // Ambas conexiones
import router from './routes';
import fs from 'fs';
import path from 'path';

async function runMigrations() {
    // Sequelize sync({ alter:true }) no elimina restricciones NOT NULL en Postgres.
    // Estas migraciones son idempotentes (IF EXISTS / DROP NOT NULL no falla si ya es nullable).
    const migraciones: string[] = [
        // CxC: id_factura e id_remision son opcionales según el flujo (PG vs directo)
        `ALTER TABLE cuenta_por_cobrar ALTER COLUMN id_remision DROP NOT NULL`,
        `ALTER TABLE cuenta_por_cobrar ALTER COLUMN id_factura  DROP NOT NULL`,
        // Chequeo: columnas añadidas manualmente si sync no las creó
        `ALTER TABLE detalle_pedido_almacen_chequeo ADD COLUMN IF NOT EXISTS id_detalle_pedido_almacen_lote UUID NULL`,
        `ALTER TABLE detalle_pedido_almacen_chequeo ADD COLUMN IF NOT EXISTS cant_surtida_lote INTEGER NULL`,
    ];

    for (const sql of migraciones) {
        try {
            await dbLocal.query(sql);
        } catch {
            // Ignorar errores (ej. columna ya existe, constraint ya fue eliminada)
        }
    }
}

async function connectDatabases() {
    try {
        await dbLocal.authenticate();
        // await dbVieja.authenticate();
        // await dbRemota.authenticate();

        console.log(colors.blue.bold('Conexión exitosa a base LOCAL'));
        console.log(colors.green.bold('Conexión exitosa a base VIEJA'));

        await runMigrations();
        await dbLocal.sync({ alter: true });
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

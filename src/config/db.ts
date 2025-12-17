import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST,           // ← corregido
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT),
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    models: [
        path.resolve(__dirname, '..', 'models', '**', '*.{ts,js}'),
        path.resolve(__dirname, '..', 'modules', '**', 'model', '*.{ts,js}')
    ],
    logging: false,
});

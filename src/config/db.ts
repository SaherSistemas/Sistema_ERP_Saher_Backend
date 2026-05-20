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
        path.resolve(__dirname, '..', 'models', '**', '*.ts'),
        path.resolve(__dirname, '..', 'models', '**', '*.js'),
        path.resolve(__dirname, '..', 'modules', '**', 'model', '*.ts'),
        path.resolve(__dirname, '..', 'modules', '**', 'model', '*.js'),
    ],
    logging: false,
});


export const dbPoly = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST_POLY,           // ← corregido
    username: process.env.DB_USER_POLY,
    password: process.env.DB_PASSWORD_POLY,
    database: process.env.DB_NAME_POLY,
    port: Number(process.env.DB_PORT_POLY),
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    logging: false,
});
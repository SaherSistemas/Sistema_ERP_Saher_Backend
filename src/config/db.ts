import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5433, //5433,
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    models: [path.resolve(__dirname, '..', 'models', '**', '*.{ts,js}')],
    logging: false,
});


export const dbVieja =  new Sequelize({
    dialect: 'postgres',
    host: process.env.DB_OLD_HOST || 'localhost',
    username: 'postgres',
    password: 'Ir711511#',
    database: 'PolyDB', // ⚡ en tu .env pones DB_NAME_OLD
    port: 5432,
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    logging: false,
});
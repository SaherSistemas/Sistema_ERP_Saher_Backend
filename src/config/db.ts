import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: 'localhost',
    username: 'postgres',
    password: '1234',
    database: 'LOCAL',
    port: 5432,
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    models: [path.resolve(__dirname, '..', 'models', '**', '*.{ts,js}')],
    logging: false,
});

/*

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: 'salazar-server',
    username: 'postgres',
    password: 'Saher2025#',
    database: 'PedroLocal',
    port: 5433,
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    models: [path.resolve(__dirname, '..', 'models', '**', '*.{ts,js}')],
    logging: false,
});

*/
/*
export const dbVieja = new Sequelize({
    dialect: 'postgres',
    host: 'salazar-server',
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
});*/
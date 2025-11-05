import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// export const dbLocal = new Sequelize({
//     dialect: 'postgres',
//     host: process.env.HOST,                  // ← del .env
//     username: process.env.DB_USER,           // ← del .env
//     password: process.env.DB_PASSWORD,       // ← del .env
//     database: process.env.DB_NAME,           // ← del .env
//     port: Number(process.env.DB_PORT),       // ← del .env
//     timezone: '+00:00',
//     dialectOptions: {
//         ssl: false,
//         useUTC: true,
//     },
//     models: [path.resolve(__dirname, '..', 'models', '**', '*.{ts,js}')],
//     logging: false,
// });




export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: process.env.HOST || 'localhost',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'LOCAL',
    port: Number(process.env.DB_PORT) || 5432,
    timezone: '+00:00',
    dialectOptions: {
        ssl: false,
        useUTC: true,
    },
    models: [path.resolve(__dirname, '..', 'models', '**', '*.{ts,js}')],
    logging: false,
});


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
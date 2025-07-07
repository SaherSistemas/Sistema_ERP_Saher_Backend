import { Sequelize } from 'sequelize-typescript';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const dbLocal = new Sequelize({
    dialect: 'postgres',
    host: process.env.HOST || 'localhost',
    username: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: 5433,
    timezone: '+00:00', // ⬅️ esto fuerza UTC
    dialectOptions: {
        ssl: false, useUTC: true, 
    },
    models: [path.join(__dirname, '/../models/**/*.ts')],  // Corrige la ruta con path.join
    logging: false,
});

//export const dbRemota = new Sequelize({
//  dialect: 'postgres',
//  host: process.env.REMOTE_DB_HOST || 'localhost', // Cambia a IP del servidor en producción
//   username: process.env.REMOTE_DB_USER || process.env.DB_USER,
//  password: process.env.REMOTE_DB_PASSWORD || process.env.DB_PASSWORD,
// database: process.env.REMOTE_DB_NAME || 'REMOTA',
//  port: Number(process.env.REMOTE_DB_PORT) || 5432,
// models: [path.join(__dirname, '/../models_remotos/**/*.ts')],
//  logging: false,
//});
